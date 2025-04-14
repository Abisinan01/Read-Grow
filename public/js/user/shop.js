// Toast notification function
function showToast(message, type = 'error') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "center",
        backgroundColor: type === 'success' ? "#16a34a" : "#dc2626",
        stopOnFocus: true,
    }).showToast();
}

document.addEventListener('DOMContentLoaded', function () {
    console.log("Shop page initialized");

    // DOM Elements
    const searchForm = document.getElementById('searchForm');
    const mobileSearchForm = document.getElementById('mobileSearchForm');
    const bookGrid = document.querySelector('.grid');
    const pagination = document.querySelector('.flex.justify-center.mt-6');
    const limit = document.getElementById('limit')?.value || 6;
    const body = document.body;

 

    // Mobile filter functionality
    initMobileFilters();

    // Get current filter attributes
    const currentFilters = {
        search: body.getAttribute("data-search") || "",
        category: body.getAttribute("data-category") || "",
        author: body.getAttribute("data-author") || "",
        price: body.getAttribute("data-price") || ""
    };

    // Highlight active filters in sidebar
    highlightActiveFilters();

    // Event Listeners
    searchForm?.addEventListener("submit", filterProducts);
    mobileSearchForm?.addEventListener("submit", filterProducts);

    // Filter click handlers
    document.querySelectorAll('aside a, .filter-sidebar a').forEach(link => {
        link.addEventListener('click', async function (event) {
            event.preventDefault();
            await fetchAndUpdate(this.href);
            highlightActiveFilters();

            // Close mobile filter sidebar if open
            const filterSidebar = document.getElementById('filterSidebar');
            const filterOverlay = document.getElementById('filterOverlay');
            if (filterSidebar?.classList.contains('active')) {
                filterSidebar.classList.remove('active');
                filterOverlay?.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // Apply filters button for mobile
    document.getElementById('applyFilters')?.addEventListener('click', function () {
        const filterSidebar = document.getElementById('filterSidebar');
        const filterOverlay = document.getElementById('filterOverlay');
        if (filterSidebar) {
            filterSidebar.classList.remove('active');
            filterOverlay?.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Pagination click handler
    pagination?.addEventListener('click', async function (event) {
        const link = event.target.closest('a');
        if (link && !link.hasAttribute('disabled')) {
            event.preventDefault();
            await fetchAndUpdate(link.href);
            // Scroll to top after pagination change
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Filter products from search input
    async function filterProducts(event) {
        event.preventDefault();
        const form = event.target;
        const searchInput = form.querySelector('input[name="search"]')?.value.trim() || "";
        const url = buildUrl(1, { ...currentFilters, search: searchInput });
        await fetchAndUpdate(url);
    }

    // Build URL with filters
    function buildUrl(page, filters) {
        let url = `/read-and-grow/shop?page=${page}&limit=${limit}`;
        if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
        if (filters.category) url += `&category=${encodeURIComponent(filters.category)}`;
        if (filters.author) url += `&author=${encodeURIComponent(filters.author)}`;
        if (filters.price) url += `&price=${encodeURIComponent(filters.price)}`;
        return url;
    }

    // Fetch data and update UI
    async function fetchAndUpdate(url) {
        try {
            // Show loading indicator
            bookGrid.innerHTML = '<div class="col-span-full flex justify-center py-12"><i class="fas fa-spinner fa-spin fa-3x text-gray-400"></i></div>';

            const response = await fetch(url, {
                method: "GET",
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            if (!response.ok) {
                throw new Error('Server responded with an error');
            }

            const result = await response.json();

            if (result.success) {
                updateData(result.allProducts, result.wishlistItems || []);
                updatePagination(result.totalPages, result.page, result);
                updateCurrentFilters(result);

                // Update browser history
                history.pushState({}, '', url);

                // Update search inputs to match current search
                const searchInputs = document.querySelectorAll('input[name="search"]');
                searchInputs.forEach(input => {
                    input.value = result.search || '';
                });

                // Update body data attributes
                Object.keys(currentFilters).forEach(key => {
                    body.setAttribute(`data-${key}`, result[key] || '');
                });
            } else {
                bookGrid.innerHTML = `<div class="text-lg text-red-600 font-semibold text-center mt-2 col-span-full">${result.errorMessage || 'No products found.'}</div>`;
            }
        } catch (error) {
            console.error('Filter error:', error.message);
            bookGrid.innerHTML = '<div class="text-lg text-red-600 font-semibold text-center mt-2 col-span-full">Failed to load products. Please try again.</div>';
            showToast("Failed to filter products");
        }
    }

    // Update current filter values
    function updateCurrentFilters(result) {
        currentFilters.search = result.search || "";
        currentFilters.category = result.category || "";
        currentFilters.author = result.author || "";
        currentFilters.price = result.price || "";
        highlightActiveFilters();
    }

    // Highlight active filter links
    function highlightActiveFilters() {
        document.querySelectorAll('aside a, .filter-sidebar a').forEach(link => {
            const href = link.getAttribute('href');

            // Check if link corresponds to any active filter
            let isActive = false;

            // Category filter
            if (currentFilters.category && href.includes(`category=${encodeURIComponent(currentFilters.category)}`)) {
                isActive = true;
            }

            // All categories (when no category is selected)
            if (!currentFilters.category && href.includes('/shop?page=') && !href.includes('category=')) {
                isActive = true;
            }

            // Author filter
            if (currentFilters.author && href.includes(`author=${encodeURIComponent(currentFilters.author)}`)) {
                isActive = true;
            }

            // Price filter
            if (currentFilters.price && href.includes(`price=${encodeURIComponent(currentFilters.price)}`)) {
                isActive = true;
            }

            // Apply active styling
            link.classList.toggle('font-bold', isActive);
            link.classList.toggle('bg-gray-100', isActive);
        });
    }

    // Update product grid with data
    function updateData(products, wishlistItems = []) {
        if (!bookGrid) return;

        bookGrid.innerHTML = '';

        if (!products?.length) {
            bookGrid.innerHTML = `<div class="text-lg text-red-600 font-semibold text-center mt-2 col-span-full">No products found.</div>`;
            return;
        }

        products.forEach(product => {
            if (!product.isBlocked) {
                const isInWishlist = wishlistItems.includes(product._id.toString());
                const stars = Array(5).fill()
                    .map((_, i) => `<i class="${i < Math.floor(product.rating) ? 'fas' : 'far'} fa-star text-sm"></i>`)
                    .join('');

                // Create product card with responsive design
                bookGrid.innerHTML += `
                    <article class="bg-white rounded-lg shadow-md hover:shadow-xl overflow-hidden transition-transform hover:scale-105">
                        <div class="relative h-48 sm:h-56 md:h-64 bg-gray-50">
                            <a href="/read-and-grow/product-details/${product._id}" class="flex justify-center h-full">
                                <img src="${product.images[0]}" alt="${product.name}" 
                                    class="w-auto h-full object-cover rounded-t-md">
                            </a>
                            <button onclick="toggleWishlist(this, '${product._id}')" 
                                class="wishlist-btn absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm hover:bg-gray-100"
                                data-product-id="${product._id}">
                                <i class="${isInWishlist ? 'fas text-red-500' : 'far text-gray-600'} fa-heart"></i>
                            </button>
                        </div>
                        <div class="p-4">
                            <h3 class="font-semibold text-base sm:text-lg truncate mb-1">
                                ${product.name}
                            </h3>
                            <p class="text-gray-600 text-sm mb-2 truncate">
                                ${product.authorName}
                            </p>
                            <div class="text-yellow-400 space-x-1 mb-2">
                                ${stars}
                            </div>
                            ${product.bestOffer ?
                        `<p class="text-sm font-semibold text-red-700 mb-2">${product.bestOffer}% offer</p>` :
                        ''}
                            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <span class="font-bold text-gray-900">Rs. ${product.price}</span>
                                <button 
                                    onclick="addToCart('${product._id}')" 
                                    id="addToCart"
                                    ${product.stock > 0 ? "" : "disabled"}
                                    class="${product.stock > 0 ?
                        'bg-black text-white px-3 py-1 sm:px-4 sm:py-2 text-sm rounded hover:bg-gray-800 transition w-full sm:w-auto text-center' :
                        'bg-gray-400 text-white px-3 py-1 sm:px-4 sm:py-2 text-sm rounded w-full sm:w-auto text-center'}"
                                    aria-label="Add ${product.name} to cart">
                                    ADD TO CART
                                </button>
                            </div>
                        </div>
                    </article>
                `;
            }
        });
    }

    // Update pagination controls
    function updatePagination(totalPages, currentPage, result) {
        if (!pagination || totalPages <= 0) return;

        pagination.innerHTML = '';
        const filters = {
            search: result.search || "",
            category: result.category || "",
            author: result.author || "",
            price: result.price || ""
        };

        // Previous page button
        pagination.innerHTML += `
            <a href="${currentPage > 1 ? buildUrl(currentPage - 1, filters) : '#'}" 
               class="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded border border-gray-300 ${currentPage > 1 ? 'hover:bg-gray-100' : 'text-gray-400 cursor-default'}" 
               ${currentPage > 1 ? '' : 'disabled'}>
                <i class="fas fa-chevron-left"></i>
            </a>
        `;

        // For better mobile pagination, show limited pages
        let startPage = Math.max(1, currentPage - 1);
        let endPage = Math.min(totalPages, currentPage + 1);

        // Ensure at least 3 page buttons when possible
        if (endPage - startPage < 2 && totalPages > 2) {
            if (startPage === 1) {
                endPage = Math.min(3, totalPages);
            } else {
                startPage = Math.max(1, endPage - 2);
            }
        }

        // Page number buttons
        for (let i = startPage; i <= endPage; i++) {
            pagination.innerHTML += `
                <a href="${buildUrl(i, filters)}" 
                   class="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded ${i === currentPage ? 'bg-black text-white' : 'border border-gray-300 hover:bg-gray-100'}">
                    ${i}
                </a>
            `;
        }

        // Next page button
        pagination.innerHTML += `
            <a href="${currentPage < totalPages ? buildUrl(currentPage + 1, filters) : '#'}" 
               class="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded border border-gray-300 ${currentPage < totalPages ? 'hover:bg-gray-100' : 'text-gray-400 cursor-default'}" 
               ${currentPage < totalPages ? '' : 'disabled'}>
                <i class="fas fa-chevron-right"></i>
            </a>
        `;
    }

    // Initialize mobile filter functionality
    function initMobileFilters() {
        const filterBtn = document.getElementById('filterBtn');
        const filterSidebar = document.getElementById('filterSidebar');
        const filterOverlay = document.getElementById('filterOverlay');
        const closeFilterBtn = document.getElementById('closeFilterBtn');

        if (filterBtn && filterSidebar) {
            filterBtn.addEventListener('click', () => {
                filterSidebar.classList.add('active');
                filterOverlay?.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }

        if (closeFilterBtn && filterSidebar) {
            closeFilterBtn.addEventListener('click', () => {
                filterSidebar.classList.remove('active');
                filterOverlay?.classList.remove('active');
                document.body.style.overflow = '';
            });
        }

        if (filterOverlay && filterSidebar) {
            filterOverlay.addEventListener('click', () => {
                filterSidebar.classList.remove('active');
                filterOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
    }
});

// Add to Cart function
let isAddToCart = false;
async function addToCart(productId) {
    if (isAddToCart) return;
    isAddToCart = true;

    try {
        const button = document.querySelector(`button[onclick="addToCart('${productId}')"]`);
        const originalText = button.innerHTML;
        // button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;

        const response = await fetch(`/read-and-grow/cart`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId })
        });

        const result = await response.json();
        if (!response.ok) {
            showToast(result.message || 'Something went wrong');
        }

        if (result.success) {
            showToast(result.message, 'success');
        }

    } catch (error) {
        console.error('Add to cart error:', error);
        showToast('Something went wrong');
    } finally {
        // Restore button state
        const button = document.querySelector(`button[onclick="addToCart('${productId}')"]`);
        if (button) {
            button.innerHTML = 'ADD TO CART';
            button.disabled = false;
        }

        // Reset flag after delay
        setTimeout(() => { isAddToCart = false; }, 1000);
    }
}

