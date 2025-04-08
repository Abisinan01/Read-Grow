function showToast(message, type = 'error') {
    Toastify({  
        text: message,
        duration: 1500,
        gravity: "top",
        position: "center",
        backgroundColor: type === 'success' ? "#16a34a" : "#dc2626",
        stopOnFocus: true,
    }).showToast();
}


document.addEventListener('DOMContentLoaded', function () {
    console.log("hello")
    const searchForm = document.getElementById('searchForm');
    const bookGrid = document.querySelector('.grid');
    const pagination = document.querySelector('.flex.space-x-2');
    const limit = document.getElementById('limit').value
    // const totalPages = document.getElementById('totalPages').value
    const body = document.body; 
    const currentSearch = body.getAttribute("data-search");
    const currentCategory = body.getAttribute("data-category");
    const currentAuthor = body.getAttribute("data-author");
    const currentPrice = body.getAttribute("data-price");
    

    // Handle form submission
    searchForm.addEventListener("submit", filterProducts);

    // Handle sidebar filter clicks
    document.querySelectorAll('aside a').forEach(link => {
        link.addEventListener('click', async function (event) {
            event.preventDefault();
            const url = this.href;
            await fetchAndUpdate(url);
        });
    });

    async function filterProducts(event) {
        event.preventDefault();
        const searchInput = document.querySelector('input[name="search"]').value.trim();
        const url = `/read-and-grow/shop?page=1&limit=${limit}${searchInput ? `&search=${encodeURIComponent(searchInput)}` : ''}${currentCategory ? `&category=${encodeURIComponent(currentCategory)}` : ''}${currentAuthor ? `&author=${encodeURIComponent(currentAuthor)}` : ''}${currentPrice ? `&price=${encodeURIComponent(currentPrice)}` : ''}`;

        await fetchAndUpdate(url);
    }

    async function fetchAndUpdate(url) {
        try {
            const response = await fetch(url, {
                method: "GET",
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const result = await response.json();

            if (response.ok && result.success) {
                updateData(result.allProducts);
                updatePagination(result.totalPages, result.page, result.search, result.category, result.author, result.price);
                history.pushState({}, '', url);
            } else {
                throw new Error(result.errorMessage || 'No products found');
            }
        } catch (error) {
            console.error('Filter error:', error.message);
            Toastify({
                text: "Failed to filter products",
                duration: 3000,
                gravity: "top",
                position: "center",
                backgroundColor: "#f44336"
            }).showToast();
        }
    }

    function updateData(products) {
        bookGrid.innerHTML = '';
        if (!products || products.length === 0) {
            bookGrid.innerHTML = `<div class="text-lg text-red-600 font-semibold text-center mt-2 col-span-full">No products found.</div>`;
            return;
        }

        products.forEach(product => {
            if (!product.isBlocked) {
                let stars = '';
                for (let i = 0; i < 5; i++) {
                    stars += i < Math.floor(product.rating) ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
                }

                bookGrid.innerHTML += `
                        <article class="bg-white rounded-lg shadow-2xl overflow-hidden transition-transform hover:scale-105">
                            <div class="relative h-64 bg-gray-50">
                                <a href="/read-and-grow/product-details/${product._id}" class="flex justify-center">
                                    <img src="${product.images[0]}" alt="${product.name}" class="w-auto h-52 md:h-64 object-cover rounded-md">
                                </a>
                                <button class="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm hover:bg-gray-100" aria-label="Add to wishlist">
                                    <i class="far fa-heart text-gray-600"></i>
                                </button>
                            </div>
                            <div class="p-4">
                                <h3 class="font-semibold text-lg mb-1">${product.name}</h3>
                                <p class="text-gray-600 text-sm mb-2">${product.authorName}</p>
                                <div class="text-yellow-400 space-x-1">${stars}</div>
                                <div class="flex justify-between items-center">
                                    <span class="font-bold text-gray-900">$${product.price}</span>
                                    <button class="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition" aria-label="Add to cart">
                                        ADD CART
                                    </button>
                                </div>
                            </div>
                        </article>
                    `;
            }
        });
    }

    function updatePagination(totalPages, currentPage, search = "", category = "", author = "", price = "") {
        pagination.innerHTML = '';
        const baseUrl = `/read-and-grow/shop?limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}${author ? `&author=${encodeURIComponent(author)}` : ''}${price ? `&price=${encodeURIComponent(price)}` : ''}`;

        pagination.innerHTML += currentPage > 1
            ? `<a href="${baseUrl}&page=${currentPage - 1}" class="w-10 h-10 flex items-center justify-center 
            rounded border border-gray-300 hover:bg-gray-100"><i class="fas fa-chevron-left"></i></a>`
            : `<a class="w-10 h-10 flex items-center justify-center rounded border border-gray-300 
            hover:bg-gray-100"><i class="fas fa-chevron-left"></i></a>`;

        for (let i = 1; i <= totalPages; i++) {
            pagination.innerHTML += `
                    <a href="${baseUrl}&page=${i}" class="w-10 h-10 flex items-center justify-center 
                    rounded ${i === currentPage ? 'bg-black text-white' :
                    'border border-gray-300 hover:bg-gray-100'}">${i}</a>`;
        }

        pagination.innerHTML += currentPage < totalPages
            ? `<a href="${baseUrl}&page=${currentPage + 1}" class="w-10 h-10 flex items-center 
            justify-center rounded border border-gray-300 hover:bg-gray-100"><i class="fas fa-chevron-right"></i></a>`
            : `<a class="w-10 h-10 flex items-center justify-center rounded border border-gray-300 
            hover:bg-gray-100"><i class="fas fa-chevron-right"></i></a>`;
    }
});
 
    let isAddToCart = false
    async function addToCart(data) {

        if (isAddToCart) return
        isAddToCart = true
        const addToCartBtn = document.getElementById('addToCart')
        if (addToCartBtn) addToCartBtn.disabled = true

        try {
            const response = await fetch(`/read-and-grow/cart`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: data })
            })
            const result = await response.json()
            console.log(result)

            if (!response.ok) {
                showToast(result.message || `Something went wrong`)
                setTimeout(() => {
                    document.getElementById('addToCart').disabled = false; // Re-enable after 2 seconds
                }, 2000);
                return
            }

            if (result.success) {
                showToast(result.message, 'success')
            }

            setTimeout(() => {
                document.getElementById('addToCart').disabled = false; // Re-enable after 2 seconds
            }, 2000);
        } catch (error) {
            console.log(`Add to cart Failed ${error.message}`)
            showToast("Something went wrong ", 'error')
        } finally {
            setTimeout(() => {
                isAddToCart = false
                if (addToCartBtn) addToCartBtn.disabled = false
            }, 2000);
        }
    }


    //=====================================

    // let isWishlistUpdating = false;
    // const wishlistItems = new Set();

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.fas.fa-heart.text-red-500').forEach(icon => {
            const button = icon.closest('button');
            if (button && button.onclick) {
                const onclickStr = button.getAttribute('onclick');
                const match = onclickStr.match(/toggleWishlist\(this,\s*'([^']+)'\)/);
                if (match && match[1]) {
                    wishlistItems.add(match[1]);
                }
            }
        });
    });

    function showToast(message, type = 'error') {
        Toastify({
            text: message,
            duration: 2000,
            gravity: "top",
            position: "center",
            backgroundColor: type === 'success' ? "#16a34a" : "#dc2626",
            stopOnFocus: true,
        }).showToast();
    }

    async function toggleWishlist(button, productId) {
        button.disabled = true;

        try {
            const url = `/read-and-grow/wishlist/add`;
            const method = "POST";
            const body = JSON.stringify({ productId });

            console.log(`Sending request to: ${url}, Method: ${method}`);

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body,
            });

            const result = await response.json();
            console.log(`Response: `, result);

            if (!response.ok) {
                showToast(result.message || "Something went wrong");
                return;
            }

            if (result.success) {
                showToast(result.message || "Added to wishlist", "success");
            }
        } catch (error) {
            console.error(`Wishlist update failed: ${error.message}`);
            showToast("Something went wrong", "error");
        } finally {
            setTimeout(() => {
                button.disabled = false;
                button.style.backgroundColor = 'red'
            }, 2000);
        }
    }

    async function removeWishlist(id) {

        try {
            const response = await fetch(`/read-and-grow/wishlist/remove/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });

            const result = await response.json();

            if (!response.ok) {
                showToast(result.message, "error");
                return;
            }

            showToast(result.message, "success");
            setTimeout(() => {
                location.reload();
            }, 2000);
        } catch (error) {
            console.log(`Remove wishlist failed: ${error.message}`);
            showToast("Something went wrong", "error");
        }
    }


