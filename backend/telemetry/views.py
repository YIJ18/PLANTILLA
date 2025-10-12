from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db.models import Q
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from .models import Sensor, TelemetryData, GyroscopeData, Alert
from .serializers import (
    SensorSerializer, TelemetryDataSerializer, TelemetryDataCreateSerializer,
    GyroscopeDataSerializer, AlertSerializer, AlertAcknowledgeSerializer
)


class SensorListCreateView(generics.ListCreateAPIView):
    """
    Vista para listar y crear sensores
    """
    queryset = Sensor.objects.all()
    serializer_class = SensorSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['sensor_type', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    @extend_schema(
        tags=['Sensores'],
        summary='Listar sensores',
        description='Obtiene la lista de todos los sensores',
        responses={200: SensorSerializer(many=True)}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        tags=['Sensores'],
        summary='Crear sensor',
        description='Crea un nuevo sensor',
        responses={201: SensorSerializer}
    )
    def post(self, request, *args, **kwargs):
        # Solo operadores y admins pueden crear sensores
        if not request.user.has_operator_access():
            return Response(
                {'error': 'No tienes permisos para crear sensores'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().post(request, *args, **kwargs)


class SensorDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vista para obtener, actualizar o eliminar un sensor específico
    """
    queryset = Sensor.objects.all()
    serializer_class = SensorSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        tags=['Sensores'],
        summary='Obtener sensor',
        description='Obtiene los detalles de un sensor específico',
        responses={200: SensorSerializer}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        tags=['Sensores'],
        summary='Actualizar sensor',
        description='Actualiza un sensor específico',
        responses={200: SensorSerializer}
    )
    def put(self, request, *args, **kwargs):
        if not request.user.has_operator_access():
            return Response(
                {'error': 'No tienes permisos para actualizar sensores'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().put(request, *args, **kwargs)
    
    @extend_schema(
        tags=['Sensores'],
        summary='Eliminar sensor',
        description='Elimina un sensor del sistema',
        responses={204: OpenApiResponse(description='Sensor eliminado')}
    )
    def delete(self, request, *args, **kwargs):
        if not request.user.has_admin_access():
            return Response(
                {'error': 'No tienes permisos para eliminar sensores'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().delete(request, *args, **kwargs)


class TelemetryDataListCreateView(generics.ListCreateAPIView):
    """
    Vista para listar y crear datos de telemetría
    """
    queryset = TelemetryData.objects.select_related('sensor').all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['sensor', 'quality']
    ordering_fields = ['timestamp', 'created_at']
    ordering = ['-timestamp']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TelemetryDataCreateSerializer
        return TelemetryDataSerializer
    
    @extend_schema(
        tags=['Telemetría'],
        summary='Listar datos de telemetría',
        description='Obtiene la lista de datos de telemetría con filtros',
        parameters=[
            OpenApiParameter('sensor', int, description='ID del sensor'),
            OpenApiParameter('quality', str, description='Calidad de los datos'),
            OpenApiParameter('start_date', str, description='Fecha inicio (YYYY-MM-DD)'),
            OpenApiParameter('end_date', str, description='Fecha fin (YYYY-MM-DD)'),
        ],
        responses={200: TelemetryDataSerializer(many=True)}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros adicionales por fecha
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(timestamp__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__date__lte=end_date)
        
        return queryset
    
    @extend_schema(
        tags=['Telemetría'],
        summary='Crear datos de telemetría',
        description='Registra nuevos datos de telemetría',
        responses={201: TelemetryDataSerializer}
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class GyroscopeDataListCreateView(generics.ListCreateAPIView):
    """
    Vista para listar y crear datos de giroscopio
    """
    queryset = GyroscopeData.objects.all()
    serializer_class = GyroscopeDataSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [OrderingFilter]
    ordering_fields = ['timestamp', 'created_at']
    ordering = ['-timestamp']
    
    @extend_schema(
        tags=['Giroscopio'],
        summary='Listar datos de giroscopio',
        description='Obtiene la lista de datos del giroscopio',
        parameters=[
            OpenApiParameter('start_date', str, description='Fecha inicio (YYYY-MM-DD)'),
            OpenApiParameter('end_date', str, description='Fecha fin (YYYY-MM-DD)'),
        ],
        responses={200: GyroscopeDataSerializer(many=True)}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros por fecha
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(timestamp__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__date__lte=end_date)
        
        return queryset
    
    @extend_schema(
        tags=['Giroscopio'],
        summary='Crear datos de giroscopio',
        description='Registra nuevos datos del giroscopio',
        responses={201: GyroscopeDataSerializer}
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class AlertListView(generics.ListAPIView):
    """
    Vista para listar alertas
    """
    queryset = Alert.objects.select_related('sensor', 'acknowledged_by').all()
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['alert_type', 'is_acknowledged', 'sensor']
    ordering_fields = ['created_at', 'alert_type']
    ordering = ['-created_at']
    
    @extend_schema(
        tags=['Alertas'],
        summary='Listar alertas',
        description='Obtiene la lista de alertas del sistema',
        responses={200: AlertSerializer(many=True)}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


@extend_schema(
    tags=['Alertas'],
    summary='Reconocer alertas',
    description='Marca alertas como reconocidas por el usuario actual',
    request=AlertAcknowledgeSerializer,
    responses={
        200: OpenApiResponse(description='Alertas reconocidas exitosamente'),
        400: OpenApiResponse(description='Datos inválidos'),
    }
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def acknowledge_alerts(request):
    """
    Vista para reconocer alertas
    """
    serializer = AlertAcknowledgeSerializer(data=request.data)
    
    if serializer.is_valid():
        alert_ids = serializer.validated_data['alert_ids']
        
        # Actualizar alertas
        updated_count = Alert.objects.filter(
            id__in=alert_ids,
            is_acknowledged=False
        ).update(
            is_acknowledged=True,
            acknowledged_by=request.user,
            acknowledged_at=timezone.now()
        )
        
        return Response({
            'message': f'{updated_count} alertas reconocidas exitosamente'
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=['Telemetría'],
    summary='Estadísticas de telemetría',
    description='Obtiene estadísticas generales de los datos de telemetría',
    responses={200: OpenApiResponse(description='Estadísticas obtenidas')}
)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def telemetry_stats(request):
    """
    Vista para obtener estadísticas de telemetría
    """
    from django.db.models import Count, Avg, Max, Min
    
    # Estadísticas generales
    total_sensors = Sensor.objects.filter(is_active=True).count()
    total_data_points = TelemetryData.objects.count()
    total_alerts = Alert.objects.count()
    unacknowledged_alerts = Alert.objects.filter(is_acknowledged=False).count()
    
    # Estadísticas por tipo de sensor
    sensor_stats = Sensor.objects.values('sensor_type').annotate(
        count=Count('id'),
        avg_readings=Avg('telemetry_data__value'),
        max_reading=Max('telemetry_data__value'),
        min_reading=Min('telemetry_data__value')
    )
    
    # Alertas por tipo
    alert_stats = Alert.objects.values('alert_type').annotate(
        count=Count('id')
    )
    
    return Response({
        'general': {
            'total_sensors': total_sensors,
            'total_data_points': total_data_points,
            'total_alerts': total_alerts,
            'unacknowledged_alerts': unacknowledged_alerts,
        },
        'sensor_stats': list(sensor_stats),
        'alert_stats': list(alert_stats),
    })