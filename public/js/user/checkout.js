let isToastShowing = false;
let isProcessing = false;

function showToast(message, type = 'error') {
    if (isToastShowing) return;

    isToastShowing = true;
    Toastify({
        text: message,
        duration: 2000,
        gravity: "top",
        position: "center",
        backgroundColor: type === 'success' ? "#16a34a" : "#dc2626",
        stopOnFocus: true,
        callback: function () {
            isToastShowing = false;
        }
    }).showToast();
}

document.addEventListener('DOMContentLoaded', function () {
    // Modal elements
    const addModal = document.getElementById('addAddressModal');
    const editModal = document.getElementById('editAddressModal');
    const addForm = document.getElementById('addAddressForm');
    const editForm = document.getElementById('editAddressForm');
    const addCancelBtn = document.getElementById('cancelAddBtn');
    const editCancelBtn = document.getElementById('cancelEditBtn');
    const saveAddBtn = document.getElementById('saveAddBtn');
    const saveEditBtn = document.getElementById('saveEditBtn');

    // Main checkout form
    const checkoutForm = document.getElementById('checkoutForm');

    // Edit address button functionality
    document.querySelectorAll('.editAddressBtn').forEach(button => {
        button.addEventListener('click', function () {
            if (isProcessing) return;

            const addressId = this.getAttribute('data-address-id');
            const addressDiv = this.closest('.bg-gray-200');
            const fullName = addressDiv.querySelector('.font-medium').textContent.trim();
            const nameParts = fullName.split(',');
            const firstName = nameParts[0].trim();
            const lastName = nameParts[1].split('(')[0].trim();
            const addressType = fullName.match(/\((.*?)\)/)[1].trim();
            const paragraphs = addressDiv.querySelectorAll('.text-gray-600');
            const street = paragraphs[0].textContent.trim();
            const city = paragraphs[1].textContent.trim();
            const state = paragraphs[2].textContent.trim();
            const phone = paragraphs[3].textContent.replace('Phone:', '').trim();
            const zipElement = document.querySelector('#editAddressForm input[name="zip"]');
            const zip = zipElement ? zipElement.value.trim() : "234343";

            editForm.querySelector('input[name="firstName"]').value = firstName;
            editForm.querySelector('input[name="lastName"]').value = lastName;
            editForm.querySelector('input[name="street"]').value = street;
            editForm.querySelector('input[name="city"]').value = city;
            editForm.querySelector('input[name="state"]').value = state;
            editForm.querySelector('input[name="zip"]').value = zip;
            editForm.querySelector('input[name="phone"]').value = phone;
            editForm.querySelector('select[name="addressType"]').value = addressType.toLowerCase();
            editForm.setAttribute('data-address-id', addressId);

            editModal.classList.remove('hidden');
        });
    });

    // Add address form submission
    if (addForm) {
        addForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (isProcessing) return;

            isProcessing = true;
            saveAddBtn.disabled = true;
            saveAddBtn.innerHTML = 'Saving...';

            const formData = new FormData(this);

            const addressData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                street: formData.get('street'),
                city: formData.get('city'),
                state: formData.get('state'),
                zip: formData.get('zip'),
                phone: formData.get('phone'),
                addressType: formData.get('addressType')
            };

            try {
                const response = await fetch('/read-and-grow/address', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(addressData)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Failed to add address');
                showToast('Address added successfully!', 'success');
                addModal.classList.add('hidden');
                setTimeout(() => {
                    location.reload();
                }, 2000);
            } catch (err) {
                showToast(err.message, 'error');
                console.error('Error adding address:', err);
            } finally {
                isProcessing = false;
                saveAddBtn.disabled = false;
                saveAddBtn.innerHTML = 'Save';
            }
        });
    }

    // Edit address form submission
    if (editForm) {
        editForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (isProcessing) return;

            isProcessing = true;
            saveEditBtn.disabled = true;
            saveEditBtn.innerHTML = 'Saving...';

            const userIdElement = document.getElementById('userId');
            const userId = userIdElement ? userIdElement.textContent.trim() : '';
            const addressId = this.getAttribute('data-address-id');

            const formData = new FormData(this);

            const addressData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                street: formData.get('street'),
                city: formData.get('city'),
                state: formData.get('state'),
                zip: formData.get('zip'),
                phone: formData.get('phone'),
                addressType: formData.get('addressType')
            };

            try {
                const response = await fetch(`/read-and-grow/address/${userId}/${addressId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(addressData)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Failed to update address');
                showToast('Address updated successfully!', 'success');
                editModal.classList.add('hidden');
                setTimeout(() => {
                    location.reload();
                }, 2000);
            } catch (err) {
                showToast(err.message, 'error');
                console.error('Error updating address:', err);
            } finally {
                isProcessing = false;
                saveEditBtn.disabled = false;
                saveEditBtn.innerHTML = 'Save';
            }
        });
    }

    // Set default address functionality
    document.querySelectorAll('.setDefaultCheckbox').forEach(checkbox => {
        checkbox.addEventListener('change', async function () {
            if (isProcessing) {
                this.checked = !this.checked;
                return;
            }

            isProcessing = true;
            const addressId = this.getAttribute('data-address-id');
            const isChecked = this.checked;
            const originalState = !isChecked;

            try {
                const response = await fetch(`/read-and-grow/address/${addressId}/set-default`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isDefault: isChecked })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Failed to set default');
                showToast(isChecked ? 'Address set as default!' : 'Address removed as default!', 'success');

                // Uncheck all other checkboxes if this one is checked
                if (isChecked) {
                    document.querySelectorAll('.setDefaultCheckbox').forEach(cb => {
                        if (cb !== this) {
                            cb.checked = false;
                        }
                    });

                    // Update hidden input for default address
                    const defaultAddressInput = document.getElementById('defaultAddress');
                    if (defaultAddressInput) {
                        defaultAddressInput.value = addressId;
                    }
                }

                setTimeout(() => {
                    location.reload();
                }, 2000);
            } catch (err) {
                showToast(err.message, 'error');
                console.error('Error setting default:', err);
                this.checked = originalState;  // Revert to original state on error
            } finally {
                setTimeout(() => {
                    isProcessing = false;
                }, 2000);
            }
        });
    });

    // Delete address
    document.querySelectorAll('.deleteAddressBtn').forEach(button => {
        button.addEventListener('click', function () {
            if (isProcessing) return;
            const addressId = this.getAttribute('data-address-id');
            deleteConfirm(addressId);
        });
    });

    window.deleteConfirm = function (id) {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) deleteAddress(id);
        });
    };

    async function deleteAddress(id) {
        if (isProcessing) return;
        isProcessing = true;

        try {
            const response = await fetch(`/read-and-grow/address/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Something went wrong');
            showToast('Address deleted successfully', 'success');
            setTimeout(() => {
                location.reload();
            }, 2000);
        } catch (error) {
            console.error("Delete address error:", error);
            showToast('Failed to delete address', 'error');
        } finally {
            setTimeout(() => {
                isProcessing = false;
            }, 2000);
        }
    }


    let isProcessing = false;

    document.querySelectorAll('.selectAddress').forEach(checkbox => {
        checkbox.addEventListener('change', async function () {
            if (isProcessing) {
                this.checked = !this.checked;
                return;
            }

            isProcessing = true;
            const addressId = this.getAttribute('data-address-id');
            console.log(addressId)
            if (!addressId) {
                console.error("Address ID not found for selected checkbox.");
                return;
            }

            const isChecked = this.checked;

            try {
                const response = await fetch(`/read-and-grow/address/${addressId}/select-address`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isSelected: isChecked })
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Failed to select address');

                showToast(result.message, 'success');
                localStorage.setItem('addressId', addressId)//temperory
                console.log(`Selected address ID: ${addressId}`);

                if (isChecked) {
                    document.querySelectorAll('.selectAddress').forEach(cb => {
                        if (cb !== this) {
                            cb.checked = false;
                        }
                    });
                }
            } catch (err) {
                showToast(err.message, 'error');
                console.error('Error selecting address:', err);
            } finally {
                setTimeout(() => { isProcessing = false; }, 1000);
            }
        });
    });



    const paymentOptions = document.querySelectorAll('input[name="paymentMethod"]');
    paymentOptions.forEach(option => {
        option.addEventListener('change', function () {
            document.querySelectorAll('.payment-option').forEach(label => {
                label.classList.remove('border-blue-500', 'border-2');
            });

            this.closest('.payment-option').classList.add('border-blue-500', 'border-2');
            console.log(`Selected payment method: ${this.value}`);
        });
    });

    const addAddressBtn = document.getElementById('addAddressBtn');
    if (addAddressBtn) {
        addAddressBtn.addEventListener('click', function () {
            if (addModal) {
                addModal.classList.remove('hidden');
            } else {
                window.location.href = '/add-address?redirect=checkout';
            }
        });
    }

    //===============================CHECKOUT FORM CONFIRM ORDER================================
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (isProcessing) return;

            const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked').value;
            const subTotal = parseFloat(document.getElementById('subTotal')?.textContent) || 0;

            const discount = document.getElementById('discount').textContent || 0;
            const shippingCharge = document.getElementById('shipping').textContent || 0;
            const finalPriceElement = document.querySelector('.text-xl.font-bold.text-red-500');
            let finalPrice;
            if (finalPriceElement) {
                finalPrice = parseFloat(finalPriceElement.dataset.price) || 0;
                console.log(finalPrice);
            }

            console.log(selectedPayment, subTotal, discount, shippingCharge, finalPrice);

            if (!selectedPayment) {
                showToast('Please select a payment method', 'error');
                return;
            }

            const selectedAddress = localStorage.getItem('addressId');
             
            localStorage.removeItem('addressId');
            if (!selectedAddress) {
                showToast('Please select an address', 'error');
                return;
            }

            if (selectedPayment === 'COD') {
                isProcessing = true;
                try {
                    const orderData = {
                        addressId: selectedAddress,
                        paymentMethod: selectedPayment,
                        addressId: selectedAddress,
                        paymentMethod: selectedPayment,
                        subTotal,
                        shippingCharge,
                        finalPrice,
                        discount,
                    };

                    console.log('Submitting order:', orderData);

                    const response = await fetch('/read-and-grow/confirm-order', {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(orderData)
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        const confirmOrderBtn = document.getElementById('confirmOrderBtn');
                        confirmOrderBtn.style.background = 'red';
                        confirmOrderBtn.disabled = true;
                        Swal.fire({
                            icon: "error",
                            title: "Oops...",
                            text: result.message,
                            footer: '<a href="/read-and-grow/shop">Continue shop</a>',
                            confirmButtonText: "OK"
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.location.href = "/read-and-grow/shop";  // Redirect after clicking "OK"
                            }
                        });

                        return;
                    }

                    Swal.fire({
                        title: 'Loading...',
                        text: 'Please wait while we fetch your orders',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        didOpen: () => {
                            Swal.showLoading();
                            setTimeout(() => {
                                window.location.href = '/read-and-grow/success';
                            }, 2000);
                        }
                    });

                } catch (err) {
                    showToast(err.message, 'error');
                    console.error('Error placing order:', err);
                } finally {
                    isProcessing = false;
                }
            }

            if (selectedPayment === 'Razorpay') {
                isProcessing = true;
                try {
                    const orderData = {
                        addressId: selectedAddress,
                        paymentMethod: selectedPayment,
                        subTotal,
                        shippingCharge,
                        finalPrice,
                        discount,
                        receipt: 'receipt#1',
                        notes: {},
                        currency: "INR"
                    };

                    console.log('Submitting order:', orderData);

                    const response = await fetch('/read-and-grow/create-order', {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(orderData)
                    });

                    const order = await response.json();

                    if (!response.ok) {
                        const errorData = await response.json();
                        return Swal.fire({
                            title: "Warning!",
                            text: "Are you sure you want to proceed?",
                            icon: "warning",
                            confirmButtonText: "OK",
                        });
                    }

                    const options = {
                        key: 'rzp_test_ft2g0i6HYiyfqh', // Replace with your Razorpay key_id
                        amount: order.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
                        currency: order.currency,
                        name: 'Read-and-grow',
                        description: 'Transaction',
                        order_id: order.id, // This is the order_id created in the backend
                        callback_url: 'http://localhost:3999/read-and-grow/success', // Your success URL
                        prefill: {
                            name: 'Abisinan',
                            email: 'abisinanabisinan9@gmail.com',
                            contact: '8086001138'
                        },
                        theme: {
                            color: '#F37254'
                        },

                        handler: function (response) {
                            fetch('/read-and-grow/verify-payment', {
                                method: "POST",
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature
                                })
                            }).then(res => res.json())
                                .then(data => {
                                    if (data.status === 'Ok') {
                                        window.location.href = '/read-and-grow/success';
                                        placeorder("paid");
                                    } else {
                                        console.log(data.message);
                                        showToast('Payment verification failed', 'error');
                                    }
                                })
                                .catch((error) => {
                                    console.error("Error:", error);
                                    showToast("Payment verification failed", "error");
                                });
                        }
                    };
                    console.log(options,1111111111)
                    // Initialize Razorpay payment
                    const rzp = new Razorpay(options);
                    rzp.open();
                    return;

                } catch (err) {
                    showToast(err.message || 'Failed to process Razorpay payment', 'error');
                    console.error('Error processing Razorpay payment:', err);
                } finally {
                    isProcessing = false;
                }
            }
        });
    }

    // Handle cancel buttons for modals if they exist
    if (addCancelBtn) {
        addCancelBtn.addEventListener('click', function () {
            addModal.classList.add('hidden');
        });
    }

    if (editCancelBtn) {
        editCancelBtn.addEventListener('click', function () {
            editModal.classList.add('hidden');
        });
    }
});