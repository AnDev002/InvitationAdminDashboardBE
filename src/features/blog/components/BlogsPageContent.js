import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import api from '../../../../services/api';
import { showErrorToast } from '../../../../Utils/toastHelper';
import BlogCard from './BlogCard';
import BlogHero from './BlogHero';

// Giả sử bạn đã setup Tailwind trong dự án React, nếu chưa thì cần cài đặt.
// Nếu dự án React cũ chưa có Tailwind, bạn có thể dùng CDN cho dev hoặc setup PostCSS.

const BlogsPageContent = () => {
    const navigate = useNavigate();
    const gridRef = useRef(null);

    // Data States
    const [blogs, setBlogs] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filter & Search States
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // 1. Fetch Data
    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
        const fetchData = async () => {
            try {
                const [postsRes, catsRes] = await Promise.all([
                    // Thêm sort createdAt để lấy bài mới nhất từ server
                    api.get('/pages?isBlog=true&isPublished=true&limit=100&sort=-createdAt'),
                    api.get('/public/page-categories')
                ]);

                if (postsRes.data?.data) setBlogs(postsRes.data.data);
                if (catsRes.data?.data) setCategories(catsRes.data.data);
            } catch (error) {
                console.error("Fetch Error:", error);
                showErrorToast("Không thể tải dữ liệu.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // 2. Memoized Filtering & Searching (Biến tấu logic lọc)
    const filteredBlogs = useMemo(() => {
        let result = blogs;

        // Filter by Category
        if (activeCategory !== 'all') {
            result = result.filter(blog => blog.category?._id === activeCategory);
        }

        // Filter by Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(blog => 
                blog.title.toLowerCase().includes(query) || 
                (blog.slug && blog.slug.includes(query))
            );
        }

        return result;
    }, [blogs, activeCategory, searchQuery]);

    const { heroPosts, regularPosts } = useMemo(() => {
        // Nếu đang search thì không hiện Hero section để tập trung kết quả tìm kiếm
        if (searchQuery) return { heroPosts: [], regularPosts: filteredBlogs };
        
        return {
            heroPosts: filteredBlogs.slice(0, 3),
            regularPosts: filteredBlogs.slice(3)
        };
    }, [filteredBlogs, searchQuery]);

    // 3. Animation Grid
    useEffect(() => {
        if (!loading && regularPosts.length > 0) {
            ScrollTrigger.batch(".blog-card-anim", {
                onEnter: batch => gsap.to(batch, {
                    autoAlpha: 1, 
                    y: 0, 
                    stagger: 0.1, 
                    duration: 0.6, 
                    overwrite: true
                }),
                start: "top 95%"
            });
        }
    }, [regularPosts, loading]);

    // --- RENDER ---
    
    if (loading) {
        // Skeleton Loading (Thay thế text loading đơn điệu)
        return (
            <div className="max-w-7xl mx-auto px-6 py-12 animate-pulse">
                <div className="h-12 w-1/3 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 w-1/4 bg-gray-200 rounded mb-12"></div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[500px] mb-12">
                    <div className="lg:col-span-8 bg-gray-200 rounded-3xl"></div>
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="flex-1 bg-gray-200 rounded-3xl"></div>
                        <div className="flex-1 bg-gray-200 rounded-3xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" ref={gridRef}>
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-2">
                            G-MALL <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">INSIGHTS</span>
                        </h1>
                        <p className="text-lg text-gray-500 font-medium">
                            Xu hướng công nghệ, lập trình & e-commerce.
                        </p>
                    </div>

                    {/* Search Bar (Biến tấu mới) */}
                    <div className="relative w-full md:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm kiếm bài viết..."
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Categories Filter (Scrollable on Mobile) */}
                <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-md py-4 mb-8 border-b border-gray-200">
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap
                                ${activeCategory === 'all' 
                                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' 
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                        >
                            Tất cả
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat._id}
                                onClick={() => setActiveCategory(cat._id)}
                                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap
                                    ${activeCategory === cat._id 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-blue-600'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Hero Section */}
                <BlogHero posts={heroPosts} navigate={navigate} />

                {/* Regular Grid Section */}
                <section>
                    <div className="flex items-center gap-2 mb-8">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Sparkles size={20} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {searchQuery ? `Kết quả tìm kiếm: "${searchQuery}"` : 'Bài viết mới nhất'}
                        </h2>
                    </div>

                    {regularPosts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {regularPosts.map(blog => (
                                <div key={blog._id} className="blog-card-anim opacity-0 translate-y-8">
                                    <BlogCard blog={blog} onClick={() => navigate(`/page/${blog.slug}`)} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-dashed border-gray-300">
                            <div className="text-6xl mb-4">🤔</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy bài viết nào</h3>
                            <p className="text-gray-500 max-w-md">
                                Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác xem sao.
                            </p>
                            <button 
                                onClick={() => {setSearchQuery(''); setActiveCategory('all');}}
                                className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                Xóa bộ lọc
                            </button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default BlogsPageContent;