from django.db import models
from django.utils.translation import gettext_lazy as _
from accounts.models import User
from telemetry.models import TelemetryData, GyroscopeData


class Mission(models.Model):
    """
    Modelo para representar misiones
    """
    STATUS_CHOICES = [
        ('planned', 'Planificada'),
        ('active', 'Activa'),
        ('completed', 'Completada'),
        ('cancelled', 'Cancelada'),
        ('emergency', 'Emergencia'),
    ]
    
    name = models.CharField(
        max_length=200,
        help_text='Nombre de la misión'
    )
    description = models.TextField(
        blank=True,
        help_text='Descripción detallada de la misión'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='planned',
        help_text='Estado actual de la misión'
    )
    priority = models.CharField(
        max_length=10,
        choices=[
            ('low', 'Baja'),
            ('medium', 'Media'),
            ('high', 'Alta'),
            ('critical', 'Crítica'),
        ],
        default='medium',
        help_text='Prioridad de la misión'
    )
    planned_start = models.DateTimeField(
        help_text='Fecha y hora planificada de inicio'
    )
    planned_end = models.DateTimeField(
        help_text='Fecha y hora planificada de finalización'
    )
    actual_start = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Fecha y hora real de inicio'
    )
    actual_end = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Fecha y hora real de finalización'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_missions',
        help_text='Usuario que creó la misión'
    )
    assigned_to = models.ManyToManyField(
        User,
        related_name='assigned_missions',
        blank=True,
        help_text='Usuarios asignados a la misión'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Misión'
        verbose_name_plural = 'Misiones'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"
    
    @property
    def duration_planned(self):
        """Duración planificada de la misión"""
        if self.planned_start and self.planned_end:
            return self.planned_end - self.planned_start
        return None
    
    @property
    def duration_actual(self):
        """Duración real de la misión"""
        if self.actual_start and self.actual_end:
            return self.actual_end - self.actual_start
        return None


class Flight(models.Model):
    """
    Modelo para representar vuelos
    """
    STATUS_CHOICES = [
        ('pre_flight', 'Pre-vuelo'),
        ('active', 'En vuelo'),
        ('landed', 'Aterrizado'),
        ('emergency', 'Emergencia'),
        ('aborted', 'Abortado'),
    ]
    
    mission = models.ForeignKey(
        Mission,
        on_delete=models.CASCADE,
        related_name='flights',
        help_text='Misión a la que pertenece el vuelo'
    )
    flight_number = models.CharField(
        max_length=50,
        unique=True,
        help_text='Número único del vuelo'
    )
    aircraft_id = models.CharField(
        max_length=100,
        help_text='Identificador de la aeronave'
    )
    pilot = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='piloted_flights',
        help_text='Piloto del vuelo'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pre_flight',
        help_text='Estado actual del vuelo'
    )
    departure_location = models.CharField(
        max_length=200,
        help_text='Ubicación de despegue'
    )
    destination_location = models.CharField(
        max_length=200,
        help_text='Ubicación de destino'
    )
    departure_latitude = models.FloatField(
        null=True,
        blank=True,
        help_text='Latitud del punto de despegue'
    )
    departure_longitude = models.FloatField(
        null=True,
        blank=True,
        help_text='Longitud del punto de despegue'
    )
    destination_latitude = models.FloatField(
        null=True,
        blank=True,
        help_text='Latitud del destino'
    )
    destination_longitude = models.FloatField(
        null=True,
        blank=True,
        help_text='Longitud del destino'
    )
    planned_departure = models.DateTimeField(
        help_text='Hora planificada de despegue'
    )
    planned_arrival = models.DateTimeField(
        help_text='Hora planificada de llegada'
    )
    actual_departure = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Hora real de despegue'
    )
    actual_arrival = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Hora real de llegada'
    )
    max_altitude = models.FloatField(
        null=True,
        blank=True,
        help_text='Altitud máxima alcanzada (metros)'
    )
    max_speed = models.FloatField(
        null=True,
        blank=True,
        help_text='Velocidad máxima alcanzada (m/s)'
    )
    distance_traveled = models.FloatField(
        null=True,
        blank=True,
        help_text='Distancia total recorrida (km)'
    )
    fuel_consumed = models.FloatField(
        null=True,
        blank=True,
        help_text='Combustible consumido (litros)'
    )
    notes = models.TextField(
        blank=True,
        help_text='Notas adicionales del vuelo'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Vuelo'
        verbose_name_plural = 'Vuelos'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'planned_departure']),
            models.Index(fields=['flight_number']),
        ]
    
    def __str__(self):
        return f"Vuelo {self.flight_number} ({self.get_status_display()})"
    
    @property
    def duration_planned(self):
        """Duración planificada del vuelo"""
        if self.planned_departure and self.planned_arrival:
            return self.planned_arrival - self.planned_departure
        return None
    
    @property
    def duration_actual(self):
        """Duración real del vuelo"""
        if self.actual_departure and self.actual_arrival:
            return self.actual_arrival - self.actual_departure
        return None


class FlightPath(models.Model):
    """
    Modelo para almacenar la ruta del vuelo
    """
    flight = models.ForeignKey(
        Flight,
        on_delete=models.CASCADE,
        related_name='flight_path'
    )
    timestamp = models.DateTimeField(
        help_text='Momento de la posición'
    )
    latitude = models.FloatField(
        help_text='Latitud de la posición'
    )
    longitude = models.FloatField(
        help_text='Longitud de la posición'
    )
    altitude = models.FloatField(
        help_text='Altitud en metros'
    )
    speed = models.FloatField(
        null=True,
        blank=True,
        help_text='Velocidad en m/s'
    )
    heading = models.FloatField(
        null=True,
        blank=True,
        help_text='Rumbo en grados'
    )
    
    class Meta:
        verbose_name = 'Punto de Ruta'
        verbose_name_plural = 'Puntos de Ruta'
        ordering = ['flight', 'timestamp']
        indexes = [
            models.Index(fields=['flight', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.flight.flight_number}: {self.latitude}, {self.longitude} ({self.timestamp})"


class FlightTelemetrySession(models.Model):
    """
    Modelo para asociar datos de telemetría con vuelos específicos
    """
    flight = models.ForeignKey(
        Flight,
        on_delete=models.CASCADE,
        related_name='telemetry_sessions'
    )
    start_time = models.DateTimeField(
        help_text='Inicio de la sesión de telemetría'
    )
    end_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Fin de la sesión de telemetría'
    )
    telemetry_data = models.ManyToManyField(
        TelemetryData,
        related_name='flight_sessions',
        blank=True,
        help_text='Datos de telemetría asociados'
    )
    gyroscope_data = models.ManyToManyField(
        GyroscopeData,
        related_name='flight_sessions',
        blank=True,
        help_text='Datos de giroscopio asociados'
    )
    
    class Meta:
        verbose_name = 'Sesión de Telemetría de Vuelo'
        verbose_name_plural = 'Sesiones de Telemetría de Vuelo'
        ordering = ['-start_time']
    
    def __str__(self):
        return f"Telemetría {self.flight.flight_number} - {self.start_time}"