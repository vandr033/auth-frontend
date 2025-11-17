export interface MensajeApi<T = any> {
    code: number; //http code
    error: boolean; //if there was an error
    message: string; //message or error description (user friendly)
    technicalMessage: string; //technical error message for debugging
    data: T; //data returned by the API
}