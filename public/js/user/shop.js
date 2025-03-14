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