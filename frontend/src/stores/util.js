import Swal from "sweetalert2";
import { useToast } from "vue-toast-notification";
import "vue-toast-notification/dist/theme-sugar.css";

async function popupDelete() {
  return Swal.fire({
    title: "Tem certeza que quer deletar este item?",
    icon: "warning",
    showCancelButton: true,
    cancelButtonColor: "#d33",
    cancelButtonText: "Não",
    confirmButtonColor: "#209f56",
    confirmButtonText: "Sim",
  }).then((result) => {
    return result.isConfirmed;
  });
}

function popupInfo() {
  const $toast = useToast();
  const style_toast = { duration: 3000, style: { fontWeight: "bold" } };
  return {
    success: (message) => {
      $toast.success(message, style_toast);
    },
    warning: (message) => {
      $toast.warning(message, style_toast);
    },
    error: (message) => {
      $toast.error(message, style_toast);
    },
    info: (message) => {
      $toast.info(message, style_toast);
    },
  };
}

export function notificarNavegador(titulo, texto) {
  popupInfo().info(texto);
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(titulo, { body: texto });
  }
}
export const isValid = {
  email(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }
}
export const formatMask = {
    money (value)  {
      if (!value) return "R$ 0,00";
      value = value.toString();
      const num = value.replace(/[^\d]/g, "");
      const filledValue = num.padStart(3, "0");
      const reais = filledValue.slice(0, -2).replace(/^0+/, "") || "0";
      const centavos = filledValue.slice(-2).padStart(2, "0");
      return `R$ ${reais},${centavos}`;
    },
    showMoney (value)  {
      if (!value) return "R$ 0,00";
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
    },

    removeMoney(value)  {
      if (!value) return 0;
      return parseFloat(value.replace(/[^\d,]/g, "").replace(",", "."));
    },
    tel(value) {
      if (!value) return '';
      return value
          .replace(/\D+/g, '')
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d)/, '$1-$2')
          .replace(/(\d{4})-(\d)(\d{4})/, '$1$2-$3')
          .replace(/(-\d{4})\d+?$/, '$1');
    },
    date(value)  {
      if (!value) return '';
      const data = new Date(value);
      const ano = data.getUTCFullYear();
      const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
      const dia = String(data.getUTCDate()).padStart(2, '0');

      return `${ano}-${mes}-${dia}`; 
    },
    viewDate(value) {
      if (!value) return '';
      const data = new Date(value);
      const ano = data.getUTCFullYear();
      const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
      const dia = String(data.getUTCDate()).padStart(2, '0');
      return `${dia}/${mes}/${ano}`;
    },
    viewDataHora(value) {
      if (!value) return '';
      const data = new Date(value);
      const dia = String(data.getDate()).padStart(2, '0');
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const ano = data.getFullYear();
      const hora = String(data.getHours()).padStart(2, '0');
      const min = String(data.getMinutes()).padStart(2, '0');
      return `${dia}/${mes}/${ano} às ${hora}:${min}`;
    }
}
export {popupInfo, popupDelete}