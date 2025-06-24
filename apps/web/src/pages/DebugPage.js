import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { apiFetch } from '../lib/api';
const DebugPage = () => {
    const [response, setResponse] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const handleSend = async () => {
        setLoading(true);
        setError(null);
        setResponse('');
        try {
            const data = await apiFetch('/api/debug', {
                method: 'POST',
                body: JSON.stringify({ message: 'Debug ping from web', timestamp: Date.now() }),
            });
            setResponse(JSON.stringify(data, null, 2));
        }
        catch (err) {
            if (err instanceof Response) {
                const text = await err.text();
                setError(`HTTP ${err.status}: ${text}`);
            }
            else if (err instanceof Error) {
                setError(err.message);
            }
            else {
                setError('Unknown error');
            }
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Debug Tools" }), _jsxs("p", { className: "text-sm text-muted-foreground", children: ["Press the button below to send a test payload to ", _jsx("code", { children: "/api/debug" }), " and view the response."] }), _jsx("button", { type: "button", className: "px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50", onClick: handleSend, disabled: loading, children: loading ? 'Sending…' : 'Send debug ping' }), response && (_jsx("pre", { className: "p-4 bg-gray-100 rounded-md overflow-auto text-sm", children: response })), error && (_jsx("p", { className: "text-red-600 text-sm", children: error }))] }));
};
export default DebugPage;
//# sourceMappingURL=DebugPage.js.map