import { HttpMethod } from "@/lib/utils/http-method";
import { ErrorType } from "@/lib/utils/client-enums";

export interface AppError {
  message: string;
  type: ErrorType;
  status?: number;
  description?: string;
  retryAction?: () => void;
}


export interface HttpRequestConfigProps {
  successRes: (response: any) => void;
  errorRes?: (errorResponse: any) => boolean | void;
  requestConfig: {
    url: string;
    method: HttpMethod;
    body?: any;
    params?: Record<string, any>;
    contentType?: string;
    baseURL?: string;
    successMessage?: string;
    responseType?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
  };
}





















