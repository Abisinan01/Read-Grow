
const notyf = new Notyf({
    duration: 2000,
    position: { x: 'right', y: 'top' }
});

async function isBlock(url) {
    try {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "Do you want to change this user's status?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes',
            cancelButtonText: 'No'
        });

        if (result.isConfirmed) {
            const response = await fetch(url, {
                method: 'PUT'
            });

            if (response.redirected) {
                window.location.href = response.url;
            } else {
                notyf.error('Failed to update user status');
            }
        }
    } catch (error) {
        notyf.error('Something went wrong');
    }
}


 
    document.getElementById("formData").addEventListener("submit", searchUser);

    async function searchUser(event) {
        event.preventDefault();

        const searchInput = document.querySelector('input[name="searchInput"]');
        const value = searchInput.value.trim();

        try {
            const query = value ? `?q=${encodeURIComponent(value)}` : '';

            const response = await fetch(`/admin/search${query}`, {
                method: 'GET',
                headers: { "Content-Type": "application/json" }
            });

            const result = await response.json();
            console.log("Search result:", result);

            const tbody = document.querySelector("tbody");

            if (!response.ok || !result.users.length) {
                tbody.innerHTML = `
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td colspan="6" class="px-6 py-4 text-center">
                            <div class="text-bold text-red-600">
                                No users found
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            updateTable(result.users);

        } catch (error) {
            console.log(`Search Failed: ${error.message}`);
        }
    }

    function updateTable(users) {
        const tbody = document.querySelector('tbody');
        tbody.innerHTML = ""; // Clear existing content

        users.forEach(user => {
            tbody.innerHTML += `
                <tr class="hover:bg-gray-50 transition">
                    <td class="px-6 py-4 whitespace-nowrap">${user.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${user.username}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${user.email}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${user.orderCount || 0}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-3 py-1 rounded-full text-sm 
                            ${user.role === 'Admin' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-800'}">
                            ${user.role}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <button onclick="isBlock('/admin/blockUser/${user._id}')"
                            class="px-4 py-2 rounded-lg text-white ${user.isBlocked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}">
                            ${user.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                    </td>
                </tr>`;
        });
    }
 