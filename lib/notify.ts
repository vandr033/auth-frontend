import Swal from "sweetalert2";

export const notify = {
    success: (title: string, text?: string) =>
        Swal.fire({ icon: "success", title, text, timer: 2500, showConfirmButton: false }),
    error: (title: string, text?: string) =>
        Swal.fire({ icon: "error", title, text }),
    warning: (title: string, text?: string) =>
        Swal.fire({ icon: "warning", title, text }),
    confirm: (title: string, text?: string) =>
        Swal.fire({
            icon: "question",
            title,
            text,
            showCancelButton: true,
            confirmButtonText: "Confirmar",
            cancelButtonText: "Cancelar",
        }),
};
