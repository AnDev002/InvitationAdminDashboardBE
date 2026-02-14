import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { getThumbnail } from '../utils/blogHelpers';

const BlogHero = ({ posts, navigate }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.hero-item', {
                y: 50,
                opacity: 0,
                duration: 1,
                stagger: 0.2,
                ease: 'power3.out'
            });
        }, containerRef);
        return () => ctx.revert();
    }, [posts]);

    if (!posts || posts.length === 0) return null;

    const mainPost = posts[0];
    const subPosts = posts.slice(1, 3);

    return (
        <section ref={containerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12 h-auto lg:h-[500px]">
            {/* Bài lớn (Chiếm 8/12 cột) */}
            <div 
                className="hero-item lg:col-span-8 relative rounded-3xl overflow-hidden cursor-pointer group shadow-lg"
                onClick={() => navigate(`/page/${mainPost.slug}`)}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                <img 
                    src={getThumbnail(mainPost.content)} 
                    alt={mainPost.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute bottom-0 left-0 p-8 z-20 w-full lg:w-3/4">
                    <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-wider text-white uppercase bg-blue-600 rounded-full">
                        Featured
                    </span>
                    <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-2">
                        {mainPost.title}
                    </h2>
                    <p className="text-gray-200 line-clamp-2 hidden lg:block">
                        {mainPost.seo?.metaDescription || 'Khám phá bài viết nổi bật nhất hôm nay.'}
                    </p>
                </div>
            </div>

            {/* Cột phải (Chiếm 4/12 cột) - Chứa 2 bài nhỏ */}
            <div className="lg:col-span-4 flex flex-col gap-6 h-full">
                {subPosts.map((post) => (
                    <div 
                        key={post._id}
                        className="hero-item relative flex-1 rounded-3xl overflow-hidden cursor-pointer group shadow-md"
                        onClick={() => navigate(`/page/${post.slug}`)}
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10" />
                        <img 
                            src={getThumbnail(post.content)} 
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                            alt={post.title}
                        />
                        <div className="absolute bottom-0 left-0 p-5 z-20">
                            <span className="text-xs font-semibold text-blue-400 mb-1 block">
                                {post.category?.name}
                            </span>
                            <h3 className="text-lg font-bold text-white leading-snug line-clamp-2 group-hover:text-blue-200 transition-colors">
                                {post.title}
                            </h3>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default BlogHero;