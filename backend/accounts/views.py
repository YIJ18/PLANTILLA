from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import update_last_login
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .models import User, UserProfile
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    ChangePasswordSerializer, LoginSerializer, UserProfileSerializer
)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vista personalizada para obtener tokens JWT
    """
    serializer_class = LoginSerializer
    
    @extend_schema(
        tags=['Autenticación'],
        summary='Iniciar sesión',
        description='Obtiene tokens de acceso y refresh para un usuario válido',
        responses={
            200: OpenApiResponse(description='Login exitoso'),
            401: OpenApiResponse(description='Credenciales inválidas'),
        }
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        
        # Actualizar último login
        update_last_login(None, user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })


@extend_schema(
    tags=['Autenticación'],
    summary='Cerrar sesión',
    description='Invalida el token de refresh del usuario',
    responses={
        200: OpenApiResponse(description='Logout exitoso'),
        400: OpenApiResponse(description='Token inválido'),
    }
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """
    Vista para cerrar sesión
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Sesión cerrada exitosamente'})
    except Exception as e:
        return Response(
            {'error': 'Token inválido'},
            status=status.HTTP_400_BAD_REQUEST
        )


class UserCreateView(generics.CreateAPIView):
    """
    Vista para crear nuevos usuarios
    """
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        tags=['Usuarios'],
        summary='Crear usuario',
        description='Crea un nuevo usuario en el sistema',
        responses={
            201: UserSerializer,
            400: OpenApiResponse(description='Datos inválidos'),
        }
    )
    def post(self, request, *args, **kwargs):
        # Solo admins pueden crear usuarios
        if not request.user.has_admin_access():
            return Response(
                {'error': 'No tienes permisos para crear usuarios'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().post(request, *args, **kwargs)


class UserListView(generics.ListAPIView):
    """
    Vista para listar usuarios
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        tags=['Usuarios'],
        summary='Listar usuarios',
        description='Obtiene la lista de todos los usuarios',
        responses={200: UserSerializer(many=True)}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vista para obtener, actualizar o eliminar un usuario específico
    """
    queryset = User.objects.all()
    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        tags=['Usuarios'],
        summary='Obtener usuario',
        description='Obtiene los detalles de un usuario específico',
        responses={200: UserSerializer}
    )
    def get(self, request, *args, **kwargs):
        self.serializer_class = UserSerializer
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        tags=['Usuarios'],
        summary='Actualizar usuario',
        description='Actualiza los datos de un usuario específico',
        responses={200: UserSerializer}
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)
    
    @extend_schema(
        tags=['Usuarios'],
        summary='Eliminar usuario',
        description='Elimina un usuario del sistema',
        responses={204: OpenApiResponse(description='Usuario eliminado')}
    )
    def delete(self, request, *args, **kwargs):
        # Solo admins pueden eliminar usuarios
        if not request.user.has_admin_access():
            return Response(
                {'error': 'No tienes permisos para eliminar usuarios'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().delete(request, *args, **kwargs)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Vista para obtener y actualizar el perfil del usuario actual
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile
    
    @extend_schema(
        tags=['Perfil'],
        summary='Obtener perfil',
        description='Obtiene el perfil del usuario autenticado',
        responses={200: UserProfileSerializer}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        tags=['Perfil'],
        summary='Actualizar perfil',
        description='Actualiza el perfil del usuario autenticado',
        responses={200: UserProfileSerializer}
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)


class ChangePasswordView(APIView):
    """
    Vista para cambiar la contraseña del usuario
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        tags=['Perfil'],
        summary='Cambiar contraseña',
        description='Cambia la contraseña del usuario autenticado',
        request=ChangePasswordSerializer,
        responses={
            200: OpenApiResponse(description='Contraseña cambiada exitosamente'),
            400: OpenApiResponse(description='Datos inválidos'),
        }
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response({'message': 'Contraseña cambiada exitosamente'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=['Perfil'],
    summary='Obtener perfil actual',
    description='Obtiene la información del usuario autenticado',
    responses={200: UserSerializer}
)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user_view(request):
    """
    Vista para obtener la información del usuario actual
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)