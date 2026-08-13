import { useRef } from 'react';
import { FiCamera } from 'react-icons/fi';
import { getUserInitials, resolveProfileImageUrl } from '../../utils/profile';

const UserAvatar = ({
  user,
  size = 'md',
  showUpload = false,
  uploading = false,
  onUpload,
  className = '',
}) => {
  const inputRef = useRef(null);
  const imageUrl = resolveProfileImageUrl(user?.profileImageUrl || user?.profileImage);
  const initials = getUserInitials(user?.fullName);

  const sizeClasses = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-20 w-20 text-xl',
    lg: 'h-24 w-24 text-2xl',
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
    }
    event.target.value = '';
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      <div
        className={`sidebar-brand-gradient flex items-center justify-center overflow-hidden rounded-full font-bold text-white shadow-md ${sizeClasses[size] || sizeClasses.md}`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={user?.fullName || 'Profile'} className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>

      {showUpload && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary-600 text-white shadow-md transition hover:bg-primary-700 disabled:opacity-70"
            title="Upload photo"
          >
            <FiCamera className="h-4 w-4" />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
};

export default UserAvatar;
