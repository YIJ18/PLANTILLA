from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """
    Modelo de usuario personalizado para el sistema Astra
    """
    ROLE_CHOICES = [
        ('admin', 'Administrador'),
        ('operator', 'Operador'),
        ('viewer', 'Visualizador'),
    ]
    
    email = models.EmailField(_('email address'), unique=True)
    first_name = models.CharField(_('first name'), max_length=150, blank=False)
    last_name = models.CharField(_('last name'), max_length=150, blank=False)
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='viewer',
        help_text='Rol del usuario en el sistema'
    )
    department = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Departamento al que pertenece el usuario'
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text='Teléfono de contacto'
    )
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_(
            'Designates whether this user should be treated as active. '
            'Unselect this instead of deleting accounts.'
        ),
    )
    date_joined = models.DateTimeField(_('date joined'), auto_now_add=True)
    last_login = models.DateTimeField(_('last login'), blank=True, null=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        verbose_name = _('Usuario')
        verbose_name_plural = _('Usuarios')
        ordering = ['date_joined']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"
    
    @property
    def full_name(self):
        """Retorna el nombre completo del usuario"""
        return f"{self.first_name} {self.last_name}".strip()
    
    def has_admin_access(self):
        """Verifica si el usuario tiene acceso de administrador"""
        return self.role == 'admin' or self.is_superuser
    
    def has_operator_access(self):
        """Verifica si el usuario puede operar el sistema"""
        return self.role in ['admin', 'operator'] or self.is_superuser


class UserProfile(models.Model):
    """
    Perfil extendido del usuario para información adicional
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    avatar = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='URL de imagen de perfil del usuario'
    )
    bio = models.TextField(
        max_length=500,
        blank=True,
        help_text='Biografía o descripción del usuario'
    )
    timezone = models.CharField(
        max_length=50,
        default='America/Mexico_City',
        help_text='Zona horaria del usuario'
    )
    language = models.CharField(
        max_length=10,
        default='es',
        choices=[
            ('es', 'Español'),
            ('en', 'English'),
        ],
        help_text='Idioma preferido del usuario'
    )
    theme = models.CharField(
        max_length=10,
        default='light',
        choices=[
            ('light', 'Claro'),
            ('dark', 'Oscuro'),
        ],
        help_text='Tema visual preferido'
    )
    notifications_enabled = models.BooleanField(
        default=True,
        help_text='Recibir notificaciones del sistema'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Perfil de Usuario'
        verbose_name_plural = 'Perfiles de Usuario'
    
    def __str__(self):
        return f"Perfil de {self.user.full_name}"