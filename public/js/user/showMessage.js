
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

async function showMessage(name, data) {

    if (name == 'wishlist') {
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

        } catch (error) {
            console.log('Add to Wishlist ', error.message)
            showToast(error.message || 'Something went wrong', 'error')
        }
    }

    if (name == 'wishlistDelete') {
        console.log(data)
        Swal.fire({
            title: "Are you sure?",
            text: "Do you really want to remove this item from your wishlist?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, remove it!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`/read-and-grow/wishlist/remove/${data[0]}}`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body:JSON.stringify({productId:data[1]})
                    })

                    const result = await response.json()

                    console.log(result)
                    if (!response.ok) {
                        throw Error(result.message || 'Product not added to wishlist')
                        return
                    }

                    Swal.fire({
                        title: "Removed!",
                        text: result.message || "Product has been removed from your wishlist.",
                        icon: "success",
                        timer: 2000,
                        showConfirmButton: false
                    });

                } catch (error) {
                    Swal.fire({
                        title: "Error!",
                        text: error.message || "Something went wrong.",
                        icon: "error"
                    });
                }
            }
        });
    }

   
} 