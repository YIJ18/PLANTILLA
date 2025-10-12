from django.db import models
from django.utils.translation import gettext_lazy as _
from accounts.models import User


class Sensor(models.Model):
    """
    Modelo para representar sensores del sistema
    """
    SENSOR_TYPE_CHOICES = [
        ('gyroscope', 'Giroscopio'),
        ('accelerometer', 'Acelerómetro'),
        ('gps', 'GPS'),
        ('altimeter', 'Altímetro'),
        ('temperature', 'Temperatura'),
        ('pressure', 'Presión'),
        ('humidity', 'Humedad'),
        ('compass', 'Brújula'),
        ('battery', 'Batería'),
        ('other', 'Otro'),
    ]
    
    name = models.CharField(
        max_length=100,
        help_text='Nombre del sensor'
    )
    sensor_type = models.CharField(
        max_length=20,
        choices=SENSOR_TYPE_CHOICES,
        help_text='Tipo de sensor'
    )
    description = models.TextField(
        blank=True,
        help_text='Descripción del sensor'
    )
    unit = models.CharField(
        max_length=20,
        help_text='Unidad de medida (ej: °C, m/s, %)'
    )
    min_value = models.FloatField(
        null=True,
        blank=True,
        help_text='Valor mínimo esperado'
    )
    max_value = models.FloatField(
        null=True,
        blank=True,
        help_text='Valor máximo esperado'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Indica si el sensor está activo'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Sensor'
        verbose_name_plural = 'Sensores'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_sensor_type_display()})"


class TelemetryData(models.Model):
    """
    Modelo para almacenar datos de telemetría
    """
    sensor = models.ForeignKey(
        Sensor,
        on_delete=models.CASCADE,
        related_name='telemetry_data'
    )
    value = models.FloatField(
        help_text='Valor medido por el sensor'
    )
    timestamp = models.DateTimeField(
        help_text='Momento de la medición'
    )
    latitude = models.FloatField(
        null=True,
        blank=True,
        help_text='Latitud donde se tomó la medición'
    )
    longitude = models.FloatField(
        null=True,
        blank=True,
        help_text='Longitud donde se tomó la medición'
    )
    altitude = models.FloatField(
        null=True,
        blank=True,
        help_text='Altitud donde se tomó la medición (metros)'
    )
    quality = models.CharField(
        max_length=10,
        choices=[
            ('good', 'Buena'),
            ('warning', 'Advertencia'),
            ('critical', 'Crítica'),
        ],
        default='good',
        help_text='Calidad de la medición'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Dato de Telemetría'
        verbose_name_plural = 'Datos de Telemetría'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['sensor', 'timestamp']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['quality']),
        ]
    
    def __str__(self):
        return f"{self.sensor.name}: {self.value} {self.sensor.unit} ({self.timestamp})"


class GyroscopeData(models.Model):
    """
    Modelo específico para datos del giroscopio
    """
    timestamp = models.DateTimeField(
        help_text='Momento de la medición'
    )
    roll = models.FloatField(
        help_text='Rotación en el eje X (grados)'
    )
    pitch = models.FloatField(
        help_text='Rotación en el eje Y (grados)'
    )
    yaw = models.FloatField(
        help_text='Rotación en el eje Z (grados)'
    )
    angular_velocity_x = models.FloatField(
        null=True,
        blank=True,
        help_text='Velocidad angular en X (°/s)'
    )
    angular_velocity_y = models.FloatField(
        null=True,
        blank=True,
        help_text='Velocidad angular en Y (°/s)'
    )
    angular_velocity_z = models.FloatField(
        null=True,
        blank=True,
        help_text='Velocidad angular en Z (°/s)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Dato de Giroscopio'
        verbose_name_plural = 'Datos de Giroscopio'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"Gyro: R:{self.roll}° P:{self.pitch}° Y:{self.yaw}° ({self.timestamp})"


class Alert(models.Model):
    """
    Modelo para alertas del sistema
    """
    ALERT_TYPE_CHOICES = [
        ('info', 'Información'),
        ('warning', 'Advertencia'),
        ('error', 'Error'),
        ('critical', 'Crítico'),
    ]
    
    title = models.CharField(
        max_length=200,
        help_text='Título de la alerta'
    )
    message = models.TextField(
        help_text='Mensaje detallado de la alerta'
    )
    alert_type = models.CharField(
        max_length=10,
        choices=ALERT_TYPE_CHOICES,
        default='info',
        help_text='Tipo de alerta'
    )
    sensor = models.ForeignKey(
        Sensor,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='alerts',
        help_text='Sensor relacionado con la alerta'
    )
    telemetry_data = models.ForeignKey(
        TelemetryData,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='alerts',
        help_text='Dato de telemetría que generó la alerta'
    )
    is_acknowledged = models.BooleanField(
        default=False,
        help_text='Indica si la alerta ha sido reconocida'
    )
    acknowledged_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acknowledged_alerts',
        help_text='Usuario que reconoció la alerta'
    )
    acknowledged_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Momento en que se reconoció la alerta'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Alerta'
        verbose_name_plural = 'Alertas'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['alert_type', 'is_acknowledged']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_alert_type_display()}: {self.title}"