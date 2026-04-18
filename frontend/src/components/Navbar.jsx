import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, LogOut, LogIn, Share2, ArrowRight } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, SignOutButton } from "@clerk/clerk-react";
import { Link, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/Navbar.css';

const API_BASE_URL = 'http://127.0.0.1:5000';

function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [sharePopoverOpen, setSharePopoverOpen] = useState(false);
    const [shareCodeInput, setShareCodeInput] = useState('');
    const [shareLoading, setShareLoading] = useState(false);
    const navigate = useNavigate();
    const popoverRef = useRef(null);
    const shareInputRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 100);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close popover on outside click
    useEffect(() => {
        const handler = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setSharePopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Auto-focus input when popover opens
    useEffect(() => {
        if (sharePopoverOpen && shareInputRef.current) {
            setTimeout(() => shareInputRef.current?.focus(), 100);
        }
    }, [sharePopoverOpen]);

    const toggleMenu = () => setIsOpen((prev) => !prev);
    const handleNavigation = (path) => { navigate(path); setIsOpen(false); };

    const handleShareCodeSubmit = async () => {
        const code = shareCodeInput.trim();
        if (!code) return;
        setShareLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/share/${code}`);
            if (res.data.success) {
                if (res.data.type === 'single') {
                    navigate('/video-generator', {
                        state: { ...JSON.parse(res.data.video.videoData), fromGallery: true, shared: true }
                    });
                } else {
                    navigate('/video-gallery', {
                        state: {
                            sharedVideos: res.data.videos,
                            sharedTitle: `Shared Gallery (${code})`,
                            ownerEmail: res.data.ownerEmail || '',
                            ownerName: res.data.ownerName || ''
                        }
                    });
                }
                setShareCodeInput('');
                setSharePopoverOpen(false);
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Invalid or expired share code');
        } finally {
            setShareLoading(false);
        }
    };

    const navItems = [
        { label: 'Home', path: '/' },
        { label: 'Content', path: '/content-gen' },
        { label: 'PPT', path: '/ppt-generator' },
        { label: 'Video', path: '/video-generator' },
        { label: 'Library', path: '/video-gallery' },
        { label: 'Dashboard', path: '/quiz/result' },
    ];

    return (
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
            <div className="navbar-container">
                {/* Logo */}
                <Link to="/" className="navbar-logo">
                    <Logo size="md" />
                </Link>

                {/* Desktop Menu */}
                <div className="navbar-menu">
                    <div className="navbar-links">
                        {navItems.map((item) => (
                            <button
                                key={item.path}
                                className="nav-link-button"
                                onClick={() => handleNavigation(item.path)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="navbar-actions">

                        {/* Share Code Icon Button + Popover */}
                        <div className="share-code-wrapper" ref={popoverRef}>
                            <button
                                className={`share-code-trigger ${sharePopoverOpen ? 'active' : ''}`}
                                onClick={() => setSharePopoverOpen((p) => !p)}
                                title="Enter a Share Code"
                            >
                                <Share2 size={16} />
                                <span>Join</span>
                            </button>

                            {sharePopoverOpen && (
                                <div className="share-code-popover">
                                    <div className="popover-header">
                                        <div className="popover-icon-ring">
                                            <Share2 size={18} />
                                        </div>
                                        <div>
                                            <p className="popover-title">Enter Share Code</p>
                                            <p className="popover-sub">Access a shared video or gallery</p>
                                        </div>
                                    </div>
                                    <div className="popover-input-row">
                                        <input
                                            ref={shareInputRef}
                                            type="text"
                                            value={shareCodeInput}
                                            onChange={(e) => setShareCodeInput(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleShareCodeSubmit(); }}
                                            placeholder="VID-XXXXXXXX or GAL-XXXXXXXX"
                                            className="popover-input"
                                            spellCheck={false}
                                        />
                                        <button
                                            className="popover-go-btn"
                                            onClick={handleShareCodeSubmit}
                                            disabled={shareLoading || !shareCodeInput.trim()}
                                        >
                                            {shareLoading ? (
                                                <span className="popover-spinner" />
                                            ) : (
                                                <ArrowRight size={18} />
                                            )}
                                        </button>
                                    </div>
                                    <p className="popover-hint">
                                        <span className="code-pill">VID-</span> for a single video &nbsp;·&nbsp;
                                        <span className="code-pill">GAL-</span> for a full gallery
                                    </p>
                                </div>
                            )}
                        </div>

                        <ThemeToggle />

                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="sign-in-button">
                                    <LogIn size={18} />
                                    <span>Sign In</span>
                                </button>
                            </SignInButton>
                        </SignedOut>
                        <SignedIn>
                            <div className="user-actions">
                                <UserButton afterSignOutUrl="/" />
                                <SignOutButton>
                                    <button className="sign-out-button" title="Sign Out">
                                        <LogOut size={18} />
                                    </button>
                                </SignOutButton>
                            </div>
                        </SignedIn>
                    </div>
                </div>

                {/* Mobile Toggle */}
                <button className="navbar-toggle" onClick={toggleMenu}>
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="navbar-mobile">
                        <div className="mobile-links">
                            {navItems.map((item) => (
                                <button
                                    key={item.path}
                                    className="mobile-link"
                                    onClick={() => handleNavigation(item.path)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <div className="mobile-actions">
                            <ThemeToggle />
                            <SignedOut>
                                <SignInButton mode="modal">
                                    <button className="sign-in-button">
                                        <LogIn size={18} />
                                        <span>Sign In</span>
                                    </button>
                                </SignInButton>
                            </SignedOut>
                            <SignedIn>
                                <div className="mobile-user-actions">
                                    <UserButton afterSignOutUrl="/" />
                                    <SignOutButton>
                                        <button className="mobile-sign-out-button">
                                            <LogOut size={18} />
                                            <span>Logout</span>
                                        </button>
                                    </SignOutButton>
                                </div>
                            </SignedIn>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Navbar;