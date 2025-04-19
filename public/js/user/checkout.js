
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
    
            // Reset previous errors
            document.querySelectorAll('.error').forEach(el => el.remove());
    
            const formData = new FormData(this);
    
            const addressData = {
                firstName: formData.get('firstName').trim(),
                lastName: formData.get('lastName').trim(),
                street: formData.get('street').trim(),
                city: formData.get('city').trim(),
                state: formData.get('state').trim(),
                zip: formData.get('zip').trim(),
                phone: formData.get('phone').trim(),
                addressType: formData.get('addressType').trim()
            };
    
            // Validation functions
            const isValidName = name => /^[A-Za-z]+$/.test(name);
            const isValidZip = zip => /^\d{5,6}$/.test(zip);
            const isValidPhone = phone => /^\d{10}$/.test(phone);
            const isValidAddressType = type => ['Home', 'Work'].includes(type);
    
            // Check required fields
            let errors = [];
    
            if (!isValidName(addressData.firstName)) errors.push({ field: 'firstName', message: 'Enter a valid first name' });
            if (!isValidName(addressData.lastName)) errors.push({ field: 'lastName', message: 'Enter a valid last name' });
            if (!addressData.street) errors.push({ field: 'street', message: 'Street is required' });
            if (!addressData.city) errors.push({ field: 'city', message: 'City is required' });
            if (!addressData.state) errors.push({ field: 'state', message: 'State is required' });
            if (!isValidZip(addressData.zip)) errors.push({ field: 'zip', message: 'Enter a valid ZIP code (5-6 digits)' });
            if (!isValidPhone(addressData.phone)) errors.push({ field: 'phone', message: 'Enter a valid 10-digit phone number' });
 
    
            // Display validation errors
            if (errors.length > 0) {
                errors.forEach(error => {
                    const inputField = document.querySelector(`[name="${error.field}"]`);
                    if (inputField) {
                        const errorMsg = document.createElement('p');
                        errorMsg.className = 'error text-red-500 text-sm';
                        errorMsg.textContent = error.message;
                        inputField.insertAdjacentElement('afterend', errorMsg);
                    }
                });
                return;
            }
    
            // If validation passes, proceed with form submission
            isProcessing = true;
            saveAddBtn.disabled = true;
            saveAddBtn.innerHTML = 'Saving...';
    
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
    
            // Reset previous errors
            document.querySelectorAll('.error').forEach(el => el.remove());
    
            const userIdElement = document.getElementById('userId');
            const userId = userIdElement ? userIdElement.textContent.trim() : '';
            const addressId = this.getAttribute('data-address-id');
    
            const formData = new FormData(this);
    
            const addressData = {
                firstName: formData.get('firstName').trim(),
                lastName: formData.get('lastName').trim(),
                street: formData.get('street').trim(),
                city: formData.get('city').trim(),
                state: formData.get('state').trim(),
                zip: formData.get('zip').trim(),
                phone: formData.get('phone').trim(),
                addressType: formData.get('addressType').trim()
            };
    
            // Validation functions
            const isValidName = name => /^[A-Za-z]+$/.test(name);
            const isValidZip = zip => /^\d{5,6}$/.test(zip);
            const isValidPhone = phone => /^\d{10}$/.test(phone);
            const isValidAddressType = type => ['Home', 'Work'].includes(type);
    
            // Check required fields
            let errors = [];
    
            if (!isValidName(addressData.firstName)) errors.push({ field: 'firstName', message: 'Enter a valid first name' });
            if (!isValidName(addressData.lastName)) errors.push({ field: 'lastName', message: 'Enter a valid last name' });
            if (!addressData.street) errors.push({ field: 'street', message: 'Street is required' });
            if (!addressData.city) errors.push({ field: 'city', message: 'City is required' });
            if (!addressData.state) errors.push({ field: 'state', message: 'State is required' });
            if (!isValidZip(addressData.zip)) errors.push({ field: 'zip', message: 'Enter a valid ZIP code (5-6 digits)' });
            if (!isValidPhone(addressData.phone)) errors.push({ field: 'phone', message: 'Enter a valid 10-digit phone number' });
 
    
            // Display validation errors
            if (errors.length > 0) {
                errors.forEach(error => {
                    const inputField = document.querySelector(`[name="${error.field}"]`);
                    if (inputField) {
                        const errorMsg = document.createElement('p');
                        errorMsg.className = 'error text-red-500 text-sm';
                        errorMsg.textContent = error.message;
                        inputField.insertAdjacentElement('afterend', errorMsg);
                    }
                });
                return;
            }
    
            // If validation passes, proceed with form submission
            isProcessing = true;
            saveEditBtn.disabled = true;
            saveEditBtn.innerHTML = 'Saving...';
    
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

            const discountElement = document.getElementById('discount');
            let discount = 0;
            if (discountElement) {
                discount = discountElement.textContent || 0;
            }
            
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
            // if (!selectedAddress) {
            //     showToast('Please select an address', 'error');
            //     return;
            // }

            if (selectedPayment === 'COD') {
                if(finalPrice > 1000){
                    showToast("COD you can't allowed over 1000/-")
                    return
                }
                placeOrder('pending')
            }

            if(selectedPayment === 'Wallet'){
                try {
                    const response = await fetch('/read-and-grow/wallet',{
                        method:"POST",
                        headers:{"Content-Type":"application/json"},
                        body: JSON.stringify({finalPrice})
                    })

                    const result = await response.json()
                    
                    if(!response.ok){
                        Swal.fire({ 
                            icon: "error",
                            title: "Oops...",
                            text: result.message,
                            footer: '<a href="#">Why do I have this issue?</a>'
                          });
                          return
                    }
             
                    Swal.fire({
                    title: result.message,
                    icon: "success",
                    
                    })

                    placeOrder('paid')
                } catch (error) {
                    console.log(error.message)
                    showToast('Wallet is not working','error')
                }
            }
 
            if (selectedPayment === 'Razorpay') {
                isProcessing = true;
                try {
                    const orderData = {
                        // addressId: selectedAddress,
                        // paymentMethod: selectedPayment,
                        // shippingCharge,
                        subTotal,
                        finalPrice,
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
                    console.log(order,'orders')
                    if (!response.ok ) {
                        Swal.fire({
                            title: "Warning!",
                            text: order.message,
                            icon: "warning",
                            confirmButtonText: "OK",
                        })
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
                                         placeOrder('paid')
                                        // window.location.href = '/read-and-grow/success';
                                    } else {
                                        console.log(data.message);
                                        showToast('Payment verification failed', 'error');
                                        failedPayment()
                                    }
                                })
                                .catch((error) => {
                                    console.error("Error:", error);
                                    showToast("Payment verification failed", "error");
                                });
                        }
                    };

                    console.log(options,"options")
                    // Initialize Razorpay payment
                        const rzp = new Razorpay(options);
                        rzp.on('payment.failed', async function (response) {
                            failedPayment()
                            Swal.fire({
                                title: "Payment Failed",
                                text: "Your order is saved. You can retry the payment from your orders section.",
                                icon: "error",
                                confirmButtonText: "Go to order",
                            }).then(() => {
                                window.location.href = "/read-and-grow/orders";  
                            });
                            
                        });
                        
                        rzp.open();
                        return;

                } catch (err) {
                    showToast(err.message || 'Failed to process Razorpay payment', 'error');
                    console.error('Error processing Razorpay payment:', err);
                } finally {
                    isProcessing = false;
                }
            }



            async function failedPayment() {
                const data = {
                    addressId: selectedAddress,
                    paymentMethod: selectedPayment,
                    subTotal,
                    shippingCharge,
                    finalPrice,
                    discount,
                    paymentStatus :"failed"
                }
                try {
                    const response = await fetch(`/read-and-grow/failed-payment`,{
                        method:"POST",
                        headers:{'Content-Type':'application/json'},
                        body:JSON.stringify(data)
                    })
                    
                    const result = await response.json()
                    if(!response.ok){
                        
                        return
                    }

                    showToast(result.message,'success')
                    window.location.href='/read-and-grow/success'

                } catch (error) {
                    console.log(error.message)
                    showToast(`Failed payment ${error.message}`)
                }
            }

            async function placeOrder(paymentStatus) {
                console.log("razopaya")
                const orderData = {
                    addressId: selectedAddress,
                    paymentMethod: selectedPayment,
                    paymentMethod: selectedPayment,
                    paymentStatus,
                    subTotal,
                    shippingCharge,
                    finalPrice,
                    discount,
                };

                try {
                    const response = await fetch("/read-and-grow/confirm-order", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(orderData),
                    });
                    const result = await response.json()
                    if (!response.ok) {
                        const confirmOrderBtn = document.getElementById('confirmOrderBtn');
                        confirmOrderBtn.style.background = 'red';
                        confirmOrderBtn.disabled = true;
                        showToast(result.message)
                        Swal.fire({
                            icon: "error",
                            title: "Oops...",
                            text: result.message,
                            footer: '<a href="/read-and-grow/shop">Continue shop</a>',
                            confirmButtonText: "OK"
                        }).then((result) => {
                            if (result.isConfirmed) {
                                // window.location.href = "/read-and-grow/";  // Redirect after clicking "OK"
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
                    console.log("error", err);
                  }
            }

        });
    }

    document.getElementById('applyCoupon').addEventListener('submit', async function (e){
        e.preventDefault()
        const couponCode = document.getElementById('couponCode').value
        const totalAmount = document.getElementById('totalAmount').value
        // const orderId  = document.getElementById('orderId').value
        

        if(!couponCode){
            showToast('Please add available coupon','error')
        }

        const response = await fetch('/read-and-grow/apply-coupon',{
            method:"POST",
            headers:{'Content-Type':"application/json"},
            body:JSON.stringify({couponCode,totalAmount})
        })

        const result = await response.json()
        if(!response.ok){
            showToast(result.message)
            return
        }
        showToast(result.message, 'success')
        const coupon = document.getElementById('coupon')
        coupon.innerHTML=totalAmount.toFixed(2)
        setTimeout(() => {
            location.reload()
        }, 1200);
    })  



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

async function removeCoupon(couponId){
    try {
        const response = await fetch('/read-and-grow/remove-coupon',{
            method:"PUT",
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({couponId})
        })
        const result = await response.json()

        if(!response.ok){
            showToast(result.message)
            return
        }

        showToast(result.message,'success')
        setTimeout(() => {
            location.reload()
        }, 1000);
    } catch (error) {
        console.log(error.message)
        showToast('Something went wrong')
    }
}