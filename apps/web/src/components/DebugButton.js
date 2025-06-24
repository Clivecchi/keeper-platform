import { jsx as _jsx } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
/**
 * Floating debug button that only renders in development builds.
 * It sits in the bottom-right corner and navigates the user to `/debug`.
 */
export const DebugButton = () => {
    const navigate = useNavigate();
    console.debug('[DebugButton] rendered');
    // Hide the button in production builds
    if (import.meta.env.PROD) {
        return null;
    }
    return (_jsx("button", { type: "button", "aria-label": "Debug", onClick: () => navigate('/debug'), style: { position: 'fixed', bottom: '16px', right: '16px', zIndex: 99999, background: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: '9999px', fontSize: '0.875rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }, className: "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-300", children: "Debug" }));
};
export default DebugButton;
//# sourceMappingURL=DebugButton.js.map