import logging
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flasgger import Swagger

logger = logging.getLogger("app.extensions")

# Initialize Flask extensions
jwt = JWTManager()
bcrypt = Bcrypt()
cors = CORS()
swagger = Swagger()
