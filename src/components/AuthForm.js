import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
export const AuthForm = ({ isRegister = false }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const auth = useAuth();
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const endpoint = isRegister ? '/api/kam/auth/register' : '/api/kam/auth/login';
        const payload = { email, password };
        if (isRegister && name) {
            payload.name = name;
        }
        try {
            const result = await apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            if (!isRegister) {
                console.log('✅ Login success:', result);
            }
            if (result.success) {
                auth.login(result.data);
                navigate('/root');
            }
            else {
                setError(result.error?.message || 'An unknown error occurred.');
            }
        }
        catch (err) {
            if (!isRegister) {
                // Debug logging for login failures
                console.error('❌ Login failed:', err);
                if (err instanceof Response) {
                    const text = await err.text();
                    console.log('⚠️ Raw response body:', text);
                }
            }
            setError('Failed to connect to the server. Please try again later.');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsxs("div", { className: "mx-auto max-w-sm", children: [_jsx("h2", { className: "font-display text-4xl font-bold text-center mb-8 text-foreground", children: isRegister ? 'Begin Your Journey' : 'Welcome Back' }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [isRegister && (_jsxs("div", { children: [_jsx("label", { htmlFor: "name", className: "sr-only", children: "Name" }), _jsx("input", { type: "text", id: "name", placeholder: "Your Name", value: name, onChange: (e) => setName(e.target.value), className: "mt-1 block w-full px-4 py-3 bg-input border border-border rounded-md shadow-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring" })] })), _jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "sr-only", children: "Email Address" }), _jsx("input", { type: "email", id: "email", placeholder: "Email Address", value: email, onChange: (e) => setEmail(e.target.value), className: "mt-1 block w-full px-4 py-3 bg-input border border-border rounded-md shadow-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring", required: true, autoComplete: "email" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "sr-only", children: "Password" }), _jsx("input", { type: "password", id: "password", placeholder: "Password", value: password, onChange: (e) => setPassword(e.target.value), className: "mt-1 block w-full px-4 py-3 bg-input border border-border rounded-md shadow-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring", required: true, autoComplete: isRegister ? "new-password" : "current-password" })] }), error && _jsx("p", { className: "text-destructive text-sm text-center", children: error }), _jsx("div", { children: _jsx("button", { type: "submit", disabled: isLoading, className: "w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-serif font-medium text-primary-foreground bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-opacity", children: isLoading ? 'Processing...' : (isRegister ? 'Register' : 'Login') }) })] })] }));
};
