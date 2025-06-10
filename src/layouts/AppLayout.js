import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { motion } from 'framer-motion';
export const AppLayout = () => {
    return (_jsxs("div", { className: "flex flex-col min-h-screen bg-background text-foreground", children: [_jsx(Navbar, {}), _jsx(motion.main, { className: "flex-grow", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.5 }, children: _jsx("div", { className: "container mx-auto px-4 sm:px-6 lg:px-8 py-12", children: _jsx(Outlet, {}) }) })] }));
};
