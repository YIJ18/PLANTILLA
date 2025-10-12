from django.urls import path
from . import views

urlpatterns = [
    # Sensores
    path('sensors/', views.SensorListCreateView.as_view(), name='sensor_list_create'),
    path('sensors/<int:pk>/', views.SensorDetailView.as_view(), name='sensor_detail'),
    
    # Datos de telemetría
    path('data/', views.TelemetryDataListCreateView.as_view(), name='telemetry_data_list_create'),
    
    # Datos de giroscopio
    path('gyroscope/', views.GyroscopeDataListCreateView.as_view(), name='gyroscope_data_list_create'),
    
    # Alertas
    path('alerts/', views.AlertListView.as_view(), name='alert_list'),
    path('alerts/acknowledge/', views.acknowledge_alerts, name='acknowledge_alerts'),
    
    # Estadísticas
    path('stats/', views.telemetry_stats, name='telemetry_stats'),
]