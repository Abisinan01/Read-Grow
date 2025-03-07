

document.addEventListener('DOMContentLoaded', function () {

    const form = document.getElementById("form")
    const username = document.getElementById("username")
    const email = document.getElementById("email")
    const phoneNumber = document.getElementById("phoneNumber")
    const confirmPassword = document.getElementById("confirmPassword")
    const password = document.getElementById("password")
    const loginButton = document.getElementById("loginButton")

    const notyf = new Notyf({
        duration: 3000,
        position: {
            x: 'center',
            y: 'top',
        }
    })

    function isRequired(value) {
        return value.trim() != "" && /[a-zA-Z]/.test(value)
    }


    function isValidEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailPattern.test(email)
    }

    function isStrongPassword(password) {
        return /[a-z]/.test(password) &&
            // /[A-Z]/       .test(password) &&
            /[0-9]/.test(password) &&
            // /[^A-Za-z0-9]/.test(password) &&
            password.length >= 6;
    }

    function isPhoneNumber(value) {
        const pattern = /^\d{10}$/;
        return pattern.test(value)
    }

    function showError(field, message) {
        clearError(field)
        const errorDiv = document.createElement("div")
        errorDiv.className = 'error'
        errorDiv.style.color = 'red'
        errorDiv.style.fontSize = "13px"
        errorDiv.innerHTML = message
        field.parentNode.insertBefore(errorDiv, field.nextSibling)
    }


    function clearError(field) {
        const errorDiv = field.parentNode.querySelector(".error")
        if (errorDiv) {
            errorDiv.remove()
        }
    }


    form.addEventListener('submit', async function (event) {


        event.preventDefault()

        clearError(username)
        clearError(email)
        clearError(phoneNumber)
        clearError(password)
        clearError(confirmPassword)


        let isValid = true
        if (!isRequired(username.value)) {
            isValid = false
            showError(username, "User name is requried")
        }

        if (!isRequired(email.value)) {
            isValid = false
            showError(email, "Email required")
        } else if (!isValidEmail(email.value)) {
            isValid = false
            showError(email, "Please enter valid email ")
        }

        if (phoneNumber.value === "") {
            isValid = false;
            showError(phoneNumber, "Phone number is required");
        } else if (!isPhoneNumber(phoneNumber.value)) {
            isValid = false;
            showError(phoneNumber, "Please enter a valid 10-digit phone number");
        }


        if (!isRequired(password.value)) {
            isValid = false
            showError(password, "Passwrod is required")
        } else if (!isStrongPassword(password.value)) {
            isValid = false
            showError(password, 'Password includes 6 charecters with strong keys')
        }

        if (!isRequired(confirmPassword.value)) {
            isValid = false
            showError(confirmPassword, "Confirm passwrod is required")
        } else if (password.value !== confirmPassword.value) {
            isValid = false
            showError(confirmPassword, "Password is not matching")
        }

        if (!isValid) return // if not valid
        
 
        const url = "/signup"

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: username.value,
                    email: email.value,
                    phoneNumber: phoneNumber.value,
                    password: password.value,
                    confirmPassword: confirmPassword.value
                })
            })

 
            const result = await response.json()

            if (!response.ok) {
                notyf.error(result.message)
                return
            }

            console.log(result, 'result fetch')

            if (result.success) {
                localStorage.setItem("otpToken",result?.token)
                notyf.success(result.message)
            }
            setTimeout(() => {
                window.location.href = result.redirect
            }, 1000);



        } catch (error) {
            console.log("Login error : ", error.message)
        }

    })
})
