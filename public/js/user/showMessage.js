
function showToast(message, type = 'error') {
    Toastify({
        text: message,
        duration: 2000,
        gravity: "top",
        position: "center",
        backgroundColor: type === 'success' ? "#16a34a" : "#dc2626", // green-600 for success, red-600 for error
        stopOnFocus: true,
    }).showToast();
}

async function addToWishlist(button,data) {
        // const wishlistBtn = document.getElementById('wishlistBtn')

        // console.log(wishlistBtn)
 
        try {
            const response = await fetch('/read-and-grow/wishlist/add', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: data })
            })

            const result = await response.json()
            console.log(result)
            if (!response.ok) {
                throw Error(result.message || 'Product not added to wishlist')
                return
            }

            showToast(result.message || 'Product added to wishlist', 'success')
            const icon = button.querySelector('i');
            if (icon) {
                icon.classList.toggle('fas');
                icon.classList.toggle('far');
                icon.classList.toggle('text-red-500');
                icon.classList.toggle('text-gray-600');
            }

            setTimeout(() => {
                location.reload()
            }, 1000);
        } catch (error) {
            console.log('Add to Wishlist ', error.message)
            showToast(error.message || 'Something went wrong', 'error')
        }
} 

async function removeWishlist(data){
    console.log(data)
    try {
        const response = await fetch(`/read-and-grow/wishlist/remove/${data}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: data })
        })

        const result = await response.json()
        console.log(result)
        if (!response.ok) {
            throw Error(result.message || 'Product remove from wishlist failed')
            return
        }

        showToast(result.message || 'Product removed from wishlist', 'success')
        setTimeout(() => {
            location.reload()
        }, 1000);
    } catch (error) {
        console.log('Remove from Wishlist ', error.message)
        showToast(error.message || 'Something went wrong', 'error')
    }
}