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

document.addEventListener('DOMContentLoaded', function() {
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
            headers:{"Content-Type":"application/json"},
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
