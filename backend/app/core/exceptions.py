from fastapi import HTTPException

class AuthorizationError(HTTPException):
    def __init__(self, detail="Access denied"):
        super().__init__(status_code=403, detail=detail)

class PatientNotFoundError(HTTPException):
    def __init__(self):
        super().__init__(status_code=404, detail="Patient not found")

class DocumentProcessingError(Exception):
    pass

class ProviderError(Exception):
    pass

class ExtractionError(Exception):
    pass