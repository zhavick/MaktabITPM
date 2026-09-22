import Swal from 'sweetalert2';

// Toast Notification
export const showToast = (title, icon = 'success') => {
  return Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
  }).fire({
    icon,
    title,
  });
};

// Confirmation Dialog
export const confirmDialog = async ({
  title = 'Apakah Anda yakin?',
  text = 'Tindakan ini tidak dapat dibatalkan.',
  icon = 'warning',
  confirmButtonText = 'Ya, Lanjutkan',
  cancelButtonText = 'Batal',
  confirmButtonColor = '#6366f1',
  cancelButtonColor = '#475569',
}) => {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonColor,
    cancelButtonColor,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
  });

  return result.isConfirmed;
};

// Alert Modal
export const successAlert = (title, text = '') => {
  return Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonColor: '#6366f1',
    confirmButtonText: 'Selesai',
  });
};

export const errorAlert = (title, text = '') => {
  return Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'Tutup',
  });
};

export const promptDialog = async ({
  title = 'Masukkan Keterangan',
  text = '',
  input = 'textarea',
  inputPlaceholder = 'Tuliskan alasan...',
  confirmButtonText = 'Kirim',
  cancelButtonText = 'Batal',
  confirmButtonColor = '#f59e0b',
  cancelButtonColor = '#475569',
  inputValidator = null
}) => {
  const result = await Swal.fire({
    title,
    text,
    input,
    inputPlaceholder,
    showCancelButton: true,
    confirmButtonColor,
    cancelButtonColor,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    inputValidator: inputValidator || ((value) => {
      if (!value || !value.trim()) {
        return 'Alasan tidak boleh kosong!';
      }
    })
  });

  return {
    isConfirmed: result.isConfirmed,
    value: result.value
  };
};

export default Swal;
