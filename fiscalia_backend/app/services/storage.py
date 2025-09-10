"""
File storage service for document management.
"""
import os
import hashlib
import shutil
from pathlib import Path
from typing import BinaryIO, Optional, Tuple
from datetime import datetime
import aiofiles
from fastapi import UploadFile

from app.core.config import settings


class StorageService:
    """
    Service for managing file storage.
    Supports local storage with option to extend to S3/GCS.
    """
    
    def __init__(self):
        # Setup storage paths
        self.base_path = Path("storage")
        self.documents_path = self.base_path / "documents"
        self.temp_path = self.base_path / "temp"
        
        # Create directories if they don't exist
        self.documents_path.mkdir(parents=True, exist_ok=True)
        self.temp_path.mkdir(parents=True, exist_ok=True)
    
    def _get_file_hash(self, file_content: bytes) -> str:
        """Generate SHA-256 hash of file content."""
        return hashlib.sha256(file_content).hexdigest()
    
    def _generate_file_path(self, user_id: int, company_id: Optional[int], 
                          file_name: str) -> Path:
        """
        Generate organized file path.
        Structure: documents/user_id/company_id/year/month/filename
        """
        now = datetime.now()
        
        if company_id:
            path = self.documents_path / str(user_id) / str(company_id) / str(now.year) / f"{now.month:02d}"
        else:
            path = self.documents_path / str(user_id) / "personal" / str(now.year) / f"{now.month:02d}"
        
        path.mkdir(parents=True, exist_ok=True)
        
        # Ensure unique filename
        base_name = Path(file_name).stem
        extension = Path(file_name).suffix
        counter = 0
        
        while True:
            if counter == 0:
                final_name = f"{base_name}{extension}"
            else:
                final_name = f"{base_name}_{counter}{extension}"
            
            final_path = path / final_name
            if not final_path.exists():
                break
            counter += 1
        
        return final_path
    
    async def save_file(
        self,
        file: UploadFile,
        user_id: int,
        company_id: Optional[int] = None
    ) -> Tuple[str, str, int]:
        """
        Save uploaded file to storage.
        
        Returns:
            Tuple of (file_path, file_hash, file_size)
        """
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Generate hash
        file_hash = self._get_file_hash(content)
        
        # Generate file path
        file_path = self._generate_file_path(user_id, company_id, file.filename)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Reset file position for potential further processing
        await file.seek(0)
        
        return str(file_path.relative_to(self.base_path)), file_hash, file_size
    
    async def get_file(self, file_path: str) -> Optional[bytes]:
        """
        Retrieve file content from storage.
        """
        full_path = self.base_path / file_path
        
        if not full_path.exists():
            return None
        
        async with aiofiles.open(full_path, 'rb') as f:
            content = await f.read()
        
        return content
    
    async def delete_file(self, file_path: str) -> bool:
        """
        Delete file from storage.
        """
        full_path = self.base_path / file_path
        
        if not full_path.exists():
            return False
        
        try:
            full_path.unlink()
            return True
        except Exception:
            return False
    
    async def move_file(self, source_path: str, dest_path: str) -> bool:
        """
        Move file within storage.
        """
        source_full = self.base_path / source_path
        dest_full = self.base_path / dest_path
        
        if not source_full.exists():
            return False
        
        # Create destination directory if needed
        dest_full.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            shutil.move(str(source_full), str(dest_full))
            return True
        except Exception:
            return False
    
    def get_file_info(self, file_path: str) -> Optional[dict]:
        """
        Get file information without reading content.
        """
        full_path = self.base_path / file_path
        
        if not full_path.exists():
            return None
        
        stat = full_path.stat()
        
        return {
            'size': stat.st_size,
            'created': datetime.fromtimestamp(stat.st_ctime),
            'modified': datetime.fromtimestamp(stat.st_mtime),
            'name': full_path.name,
            'extension': full_path.suffix
        }
    
    def get_storage_stats(self, user_id: int) -> dict:
        """
        Get storage statistics for a user.
        """
        user_path = self.documents_path / str(user_id)
        
        if not user_path.exists():
            return {
                'total_files': 0,
                'total_size_mb': 0,
                'file_types': {}
            }
        
        total_files = 0
        total_size = 0
        file_types = {}
        
        for file_path in user_path.rglob('*'):
            if file_path.is_file():
                total_files += 1
                total_size += file_path.stat().st_size
                
                ext = file_path.suffix.lower()
                file_types[ext] = file_types.get(ext, 0) + 1
        
        return {
            'total_files': total_files,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'file_types': file_types
        }
    
    async def create_temp_file(self, content: bytes, suffix: str = '') -> str:
        """
        Create temporary file for processing.
        """
        import tempfile
        
        with tempfile.NamedTemporaryFile(
            delete=False,
            dir=self.temp_path,
            suffix=suffix
        ) as tmp:
            tmp.write(content)
            return tmp.name
    
    def cleanup_temp_files(self, max_age_hours: int = 24):
        """
        Clean up old temporary files.
        """
        import time
        
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        for file_path in self.temp_path.iterdir():
            if file_path.is_file():
                file_age = current_time - file_path.stat().st_mtime
                if file_age > max_age_seconds:
                    try:
                        file_path.unlink()
                    except Exception:
                        pass


# Singleton instance
storage_service = StorageService()