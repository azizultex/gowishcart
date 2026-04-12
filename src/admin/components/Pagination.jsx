import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, totalItems, perPage, onPageChange }) => {
    if (totalPages <= 1) {
        return null;
    }

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 7; // Show up to 7 page numbers
        
        if (totalPages <= maxVisible) {
            // Show all pages if total is less than maxVisible
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);
            
            let startPage = Math.max(2, currentPage - 1);
            let endPage = Math.min(totalPages - 1, currentPage + 1);
            
            // Adjust if we're near the start
            if (currentPage <= 3) {
                endPage = Math.min(5, totalPages - 1);
            }
            
            // Adjust if we're near the end
            if (currentPage >= totalPages - 2) {
                startPage = Math.max(2, totalPages - 4);
            }
            
            // Add ellipsis after first page if needed
            if (startPage > 2) {
                pages.push('ellipsis-start');
            }
            
            // Add middle pages
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            
            // Add ellipsis before last page if needed
            if (endPage < totalPages - 1) {
                pages.push('ellipsis-end');
            }
            
            // Always show last page
            pages.push(totalPages);
        }
        
        return pages;
    };

    const pageNumbers = getPageNumbers();
    const startItem = (currentPage - 1) * perPage + 1;
    const endItem = Math.min(currentPage * perPage, totalItems);

    return (
        <div className="pagination">
            <div className="pagination-info">
                Showing {startItem}-{endItem} of {totalItems}
            </div>
            <div className="pagination-controls">
                <button
                    className="pagination-button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                >
                    <ChevronLeft size={16} />
                </button>
                
                <div className="pagination-pages">
                    {pageNumbers.map((page, index) => {
                        if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                            return (
                                <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                                    ...
                                </span>
                            );
                        }
                        
                        return (
                            <button
                                key={page}
                                className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                                onClick={() => onPageChange(page)}
                                aria-label={`Page ${page}`}
                                aria-current={currentPage === page ? 'page' : undefined}
                            >
                                {page}
                            </button>
                        );
                    })}
                </div>
                
                <button
                    className="pagination-button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;

