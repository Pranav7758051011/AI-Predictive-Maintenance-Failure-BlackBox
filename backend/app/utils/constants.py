class UserRole:
    """User roles for RBAC."""
    ADMIN = "ADMIN"
    ENGINEER = "ENGINEER"
    VIEWER = "VIEWER"
    CLIENT = "CLIENT"
    
    ALL = [ADMIN, ENGINEER, VIEWER, CLIENT]

class MachineStatus:
    """Operational statuses of industrial machines."""
    HEALTHY = "HEALTHY"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    MAINTENANCE = "MAINTENANCE"
    OFFLINE = "OFFLINE"
    
    ALL = [HEALTHY, WARNING, CRITICAL, MAINTENANCE, OFFLINE]

class ProductType:
    """Product quality types from AI4I dataset."""
    LOW = "L"
    MEDIUM = "M"
    HIGH = "H"
    
    ALL = [LOW, MEDIUM, HIGH]

class FailureType:
    """Multi-label failure classifications."""
    NONE = "None"
    TWF = "Tool Wear Failure (TWF)"
    HDF = "Heat Dissipation Failure (HDF)"
    PWF = "Power Failure (PWF)"
    OSF = "Overstrain Failure (OSF)"
    RNF = "Random Failure (RNF)"
    
    ALL = [TWF, HDF, PWF, OSF, RNF]

class BlackBoxStatus:
    """Investigation status of a Failure Black Box."""
    OPEN = "OPEN"
    UNDER_INVESTIGATION = "UNDER_INVESTIGATION"
    RESOLVED = "RESOLVED"
    
    ALL = [OPEN, UNDER_INVESTIGATION, RESOLVED]

class BlackBoxTriggerSource:
    """Trigger sources for Black Box recording."""
    AUTOMATIC_THRESHOLD = "AUTOMATIC_THRESHOLD"
    MANUAL_TRIGGER = "MANUAL_TRIGGER"
    EMERGENCY_SHUTDOWN = "EMERGENCY_SHUTDOWN"
    
    ALL = [AUTOMATIC_THRESHOLD, MANUAL_TRIGGER, EMERGENCY_SHUTDOWN]

class MaintenanceStatus:
    """Work order statuses."""
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    
    ALL = [SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED]

class MaintenancePriority:
    """Work order priority levels."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    
    ALL = [LOW, MEDIUM, HIGH, CRITICAL]
