from django.urls import path
from . import views

urlpatterns = [
    # Vuelos - Ruta principal
    path('', views.FlightListCreateView.as_view(), name='flight_list_create'),
    path('<int:pk>/', views.FlightDetailView.as_view(), name='flight_detail'),
    path('<int:pk>/status/', views.update_flight_status, name='update_flight_status'),
    
    # Misiones
    path('missions/', views.MissionListCreateView.as_view(), name='mission_list_create'),
    path('missions/<int:pk>/', views.MissionDetailView.as_view(), name='mission_detail'),
    
    # Ruta de vuelo específica
    path('<int:flight_id>/path/', views.FlightPathListCreateView.as_view(), name='flight_path_list_create'),
    
    # Dashboard y estadísticas
    path('dashboard/', views.flight_dashboard, name='flight_dashboard'),
    path('history/', views.flight_history, name='flight_history'),
]