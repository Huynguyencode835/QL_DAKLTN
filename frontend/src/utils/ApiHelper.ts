import Apis, { authApis, endpoints } from "../config/Apis";

const handleError = (err: any, onError?: any) => {
    const status = err.response?.status;
    const errData = err.response?.data;

    if (status >= 400 && status < 500) {
        onError?.("client", err.response?.data?.detail || "Yêu cầu không hợp lệ.", errData);
    } else if (status >= 500) {
        onError?.("server", "Lỗi máy chủ. Vui lòng thử lại sau.");
    } else {
        onError?.("network", "Không thể kết nối. Kiểm tra lại mạng.");
    }

    if (!status || status >= 500) {
        console.error("API Error:", err.message || err);
    }
};


export const fetchWithAuth = async (endpoint: string, onSuccess?: any, onError?: any, params: any = {}, setLoading?: any) => {
    setLoading?.(true);
    try {
        const token = localStorage.getItem("access_token");
        let res = await authApis(token).get(endpoint, { params });
        if (res.status === 200) onSuccess(res.data);
    } catch (err) { handleError(err, onError); }
    finally { setLoading?.(false); }
};

export const createWithAuth = async (endpoint: string, body: any, onSuccess?: any, onError?: any, setLoading?: any) => {
    setLoading?.(true);
    try {
        const token = localStorage.getItem("access_token");
        const isFormData = body instanceof FormData;
        let res = await authApis(token).post(endpoint, body, {
            headers: isFormData ? {
                'Content-Type': 'multipart/form-data',
            } : {}
        });
        if (res.status === 200 || res.status === 201) onSuccess(res.data);
    } catch (err) { handleError(err, onError); }
    finally { setLoading?.(false); }
};

export const updateWithAuth = async (endpoint: string, body: any, onSuccess?: any, onError?: any, setLoading?: any) => {
    setLoading?.(true);
    try {
        const token = localStorage.getItem("access_token");
        let res = await authApis(token).put(endpoint, body);
        if (res.status === 200) onSuccess(res.data);
    } catch (err) { handleError(err, onError); }
    finally { setLoading?.(false); }
};

export const updatePatchWithAuth = async (endpoint: string, body: any, onSuccess?: any, onError?: any, setLoading?: any) => {
    setLoading?.(true);
    try {
        const token = localStorage.getItem("access_token");
        let res = await authApis(token).patch(endpoint, body);
        if (res.status === 200) onSuccess(res.data);
    } catch (err) { handleError(err, onError); }
    finally { setLoading?.(false); }
};

export const deleteWithAuth = async (endpoint: string, onSuccess?: any, onError?: any, setLoading?: any) => {
    setLoading?.(true);
    try {
        const token = localStorage.getItem("access_token");
        let res = await authApis(token).delete(endpoint);
        if (res.status === 200 || res.status === 204) onSuccess();
    } catch (err) { handleError(err, onError); }
    finally { setLoading?.(false); }
};


export const fetchPublic = async (endpoint: string, onSuccess?: any, onError?: any, params: any = {}, setLoading?: any) => {
    setLoading?.(true);
    try {
        let res = await Apis.get(endpoint, { params });
        if (res.status === 200)
            onSuccess(res.data.results ?? res.data, res.data.next);
    } catch (err) { handleError(err, onError); }
    finally { setLoading?.(false); }
};

export const createPublic = async (endpoint: string, body: any, onSuccess?: any, onError?: any, headers: any = {}, onFinally?: any, setLoading?: any) => {
    setLoading?.(true);
    try {
        const isFormData = body instanceof FormData;
        const isUrlEncoded = typeof body === 'string';

        const defaultHeaders = isFormData
            ? { 'Content-Type': 'multipart/form-data' }
            : isUrlEncoded
                ? { 'Content-Type': 'application/x-www-form-urlencoded' }
                : { 'Content-Type': 'application/json' };

        const mergedHeaders = { ...defaultHeaders, ...headers };
        let res = await Apis.post(endpoint, body, { headers: mergedHeaders });
        if (res.status === 200 || res.status === 201) onSuccess(res.data);
    } catch (err) {
        console.log('Error status:', err.response?.status);
        console.log('Error data:', err.response?.data);
        console.log('Error message:', err.message);
        handleError(err, onError);
    }
    finally {
        onFinally?.();
        setLoading?.(false);
    }
};
