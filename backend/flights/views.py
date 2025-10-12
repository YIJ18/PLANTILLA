from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db.models import Q, Count
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from .models import Mission, Flight, FlightPath, FlightTelemetrySession
from .serializers import (
    MissionSerializer, MissionCreateSerializer, FlightSerializer,
    FlightCreateSerializer, FlightPathSerializer, FlightTelemetrySessionSerializer,
    FlightStatusUpdateSerializer, FlightSummarySerializer
)


class MissionListCreateView(generics.ListCreateAPIView):
    """
    Vista para listar y crear misiones
    """
    queryset = Mission.objects.prefetch_related('assigned_to').select_related('created_by').all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'planned_start', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MissionCreateSerializer
        return MissionSerializer
    
    @extend_schema(
        tags=['Misiones'],
        summary='Listar misiones',
        description='Obtiene la lista de misiones',
        responses={200: MissionSerializer(many=True)}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        tags=['Misiones'],
        summary='Crear misión',
        description='Crea una nueva misión',
        responses={201: MissionSerializer}
    )
    def post(self, request, *args, **kwargs):
        # Solo operadores y admins pueden crear misiones
        if not request.user.has_operator_access():
            return Response(
                {'error': 'No tienes permisos para crear misiones'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().post(request, *args, **kwargs)


class MissionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vista para obtener, actualizar o eliminar una misión específica
    """
    queryset = Mission.objects.prefetch_related('assigned_to', 'flights').select_related('created_by').all()
    serializer_class = MissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        tags=['Misiones'],
        summary='Obtener misión',
        description='Obtiene los detalles de una misión específica',
        responses={200: MissionSerializer}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        tags=['Misiones'],
        summary='Actualizar misión',
        description='Actualiza una misión específica',
        responses={200: MissionSerializer}
    )
    def put(self, request, *args, **kwargs):
        if not request.user.has_operator_access():
            return Response(
                {'error': 'No tienes permisos para actualizar misiones'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().put(request, *args, **kwargs)
    
    @extend_schema(
        tags=['Misiones'],
        summary='Eliminar misión',
        description='Elimina una misión del sistema',
        responses={204: OpenApiResponse(description='Misión eliminada')}
    )
    def delete(self, request, *args, **kwargs):
        if not request.user.has_admin_access():
            return Response(
                {'error': 'No tienes permisos para eliminar misiones'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().delete(request, *args, **kwargs)


class FlightListCreateView(generics.ListCreateAPIView):
    """
    Vista para listar y crear vuelos
    """
    queryset = Flight.objects.select_related('mission', 'pilot').all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'mission', 'pilot']
    search_fields = ['flight_number', 'aircraft_id', 'departure_location', 'destination_location']
    ordering_fields = ['flight_number', 'planned_departure', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return FlightCreateSerializer
        return FlightSerializer
    
    @extend_schema(
        tags=['Vuelos'],
        summary='Listar vuelos',
        description='Obtiene la lista de vuelos',
        responses={200: FlightSerializer(many=True)}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        tags=['Vuelos'],
        summary='Crear vuelo',
        description='Crea un nuevo vuelo',
        responses={201: FlightSerializer}
    )
    def post(self, request, *args, **kwargs):
        if not request.user.has_operator_access():
            return Response(
                {'error': 'No tienes permisos para crear vuelos'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().post(request, *args, **kwargs)


class FlightDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vista para obtener, actualizar o eliminar un vuelo específico
    """
    queryset = Flight.objects.select_related('mission', 'pilot').prefetch_related('flight_path').all()
    serializer_class = FlightSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        tags=['Vuelos'],
        summary='Obtener vuelo',
        description='Obtiene los detalles de un vuelo específico',
        responses={200: FlightSerializer}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        tags=['Vuelos'],
        summary='Actualizar vuelo',
        description='Actualiza un vuelo específico',
        responses={200: FlightSerializer}
    )
    def put(self, request, *args, **kwargs):
        if not request.user.has_operator_access():
            return Response(
                {'error': 'No tienes permisos para actualizar vuelos'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().put(request, *args, **kwargs)


@extend_schema(
    tags=['Vuelos'],
    summary='Actualizar estado de vuelo',
    description='Actualiza el estado de un vuelo específico',
    request=FlightStatusUpdateSerializer,
    responses={
        200: FlightSerializer,
        400: OpenApiResponse(description='Datos inválidos'),
    }
)
@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_flight_status(request, pk):
    """
    Vista para actualizar el estado de un vuelo
    """
    try:
        flight = Flight.objects.get(pk=pk)
    except Flight.DoesNotExist:
        return Response(
            {'error': 'Vuelo no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Solo operadores pueden actualizar el estado
    if not request.user.has_operator_access():
        return Response(
            {'error': 'No tienes permisos para actualizar el estado del vuelo'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = FlightStatusUpdateSerializer(flight, data=request.data, partial=True)
    
    if serializer.is_valid():
        new_status = serializer.validated_data['status']
        notes = serializer.validated_data.get('notes', '')
        
        # Actualizar timestamps según el estado
        if new_status == 'active' and not flight.actual_departure:
            flight.actual_departure = timezone.now()
        elif new_status in ['landed', 'aborted'] and not flight.actual_arrival:
            flight.actual_arrival = timezone.now()
        
        flight.status = new_status
        if notes:
            flight.notes = f"{flight.notes}\n{timezone.now().strftime('%Y-%m-%d %H:%M')}: {notes}"
        
        flight.save()
        
        return Response(FlightSerializer(flight).data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FlightPathListCreateView(generics.ListCreateAPIView):
    """
    Vista para listar y crear puntos de ruta de vuelo
    """
    serializer_class = FlightPathSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [OrderingFilter]
    ordering_fields = ['timestamp']
    ordering = ['timestamp']
    
    def get_queryset(self):
        flight_id = self.kwargs.get('flight_id')
        return FlightPath.objects.filter(flight_id=flight_id)
    
    @extend_schema(
        tags=['Ruta de Vuelo'],
        summary='Listar puntos de ruta',
        description='Obtiene los puntos de ruta de un vuelo específico',
        responses={200: FlightPathSerializer(many=True)}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        tags=['Ruta de Vuelo'],
        summary='Crear punto de ruta',
        description='Registra un nuevo punto en la ruta del vuelo',
        responses={201: FlightPathSerializer}
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        flight_id = self.kwargs.get('flight_id')
        serializer.save(flight_id=flight_id)


@extend_schema(
    tags=['Vuelos'],
    summary='Dashboard de vuelos',
    description='Obtiene estadísticas y resumen de vuelos activos',
    responses={200: OpenApiResponse(description='Dashboard obtenido')}
)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def flight_dashboard(request):
    """
    Vista para obtener el dashboard de vuelos
    """
    # Vuelos activos
    active_flights = Flight.objects.filter(status='active').select_related('mission', 'pilot')
    
    # Estadísticas generales
    total_flights = Flight.objects.count()
    flights_today = Flight.objects.filter(
        planned_departure__date=timezone.now().date()
    ).count()
    
    # Vuelos por estado
    flight_stats = Flight.objects.values('status').annotate(
        count=Count('id')
    )
    
    # Misiones activas
    active_missions = Mission.objects.filter(status='active').count()
    
    return Response({
        'active_flights': FlightSummarySerializer(active_flights, many=True).data,
        'stats': {
            'total_flights': total_flights,
            'flights_today': flights_today,
            'active_missions': active_missions,
            'flight_by_status': list(flight_stats),
        }
    })


@extend_schema(
    tags=['Vuelos'],
    summary='Historial de vuelos',
    description='Obtiene el historial de vuelos con filtros avanzados',
    parameters=[
        OpenApiParameter('start_date', str, description='Fecha inicio (YYYY-MM-DD)'),
        OpenApiParameter('end_date', str, description='Fecha fin (YYYY-MM-DD)'),
        OpenApiParameter('pilot', int, description='ID del piloto'),
        OpenApiParameter('mission', int, description='ID de la misión'),
    ],
    responses={200: FlightSerializer(many=True)}
)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def flight_history(request):
    """
    Vista para obtener el historial de vuelos con filtros
    """
    queryset = Flight.objects.select_related('mission', 'pilot').all()
    
    # Aplicar filtros
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    pilot_id = request.query_params.get('pilot')
    mission_id = request.query_params.get('mission')
    
    if start_date:
        queryset = queryset.filter(planned_departure__date__gte=start_date)
    if end_date:
        queryset = queryset.filter(planned_departure__date__lte=end_date)
    if pilot_id:
        queryset = queryset.filter(pilot_id=pilot_id)
    if mission_id:
        queryset = queryset.filter(mission_id=mission_id)
    
    # Ordenar por fecha descendente
    queryset = queryset.order_by('-planned_departure')
    
    # Paginación manual básica
    page_size = 20
    page = int(request.query_params.get('page', 1))
    start = (page - 1) * page_size
    end = start + page_size
    
    flights = queryset[start:end]
    total_count = queryset.count()
    
    return Response({
        'results': FlightSerializer(flights, many=True).data,
        'count': total_count,
        'page': page,
        'page_size': page_size,
        'total_pages': (total_count + page_size - 1) // page_size
    })