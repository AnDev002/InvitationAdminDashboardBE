import React from 'react';
import { Calendar, User, Clock, ArrowUpRight } from 'lucide-react';
import { getThumbnail, getExcerpt, calculateReadTime } from '../utils/blogHelpers';

const BlogCard = ({ blog, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className="group relative flex flex-col h-full bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 cursor-pointer"
        >
            {/* Image Section */}
            <div className="relative h-48 overflow-hidden">
                <img 
                    src={getThumbnail(blog.content)} 
                    alt={blog.title} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out"
                />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-blue-600 shadow-sm">
                    {blog.category?.name || 'News'}
                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col flex-1 p-5">
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(blog.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {calculateReadTime(blog.content)} min read
                    </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {blog.title}
                </h3>

                <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1">
                    {getExcerpt(blog.content)}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                            {(blog.author?.name || 'G')[0]}
                        </div>
                        <span className="text-xs font-medium text-gray-700">
                            {blog.author?.name || 'G-Mall Team'}
                        </span>
                    </div>
                    <ArrowUpRight size={18} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </div>
            </div>
        </div>
    );
};

export default BlogCard;