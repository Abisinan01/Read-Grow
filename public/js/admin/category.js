
    const notyf = new Notyf({
        duration: 3000,
        position: { x: 'right', y: 'top' }
    });


function deleteConfirm(categoryId) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            deleteCategory(categoryId);
        }
    });
}
 
// Function to delete category
async function deleteCategory(categoryId) {
    try {
        const response = await fetch(`/admin/category/${categoryId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            return notyf.error(result.message || 'Something went wrong');
        }
        
        if (result.success) {
            notyf.success('Category deleted successfully');
            // Reload the page to see changes
            location.reload();
        }
    } catch (error) {
        console.error("Delete category error:", error);
        notyf.error('Failed to delete category');
    }
}

 
document.getElementById('formData').addEventListener('submit', async (event) => {
    event.preventDefault();
    const searchInput = document.querySelector('input[name="searchInput"]');
    const value = searchInput.value.trim();

    try {
        const query = value ? `?q=${encodeURIComponent(value)}` : '';
        const response = await fetch(`/admin/search-category${query}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();
        
        if (!response.ok) {
            const tbody = document.querySelector("tbody");
            tbody.innerHTML = `
            <tr class="hover:bg-gray-50 transition-colors">
                <td colspan="6" class="px-6 py-4 text-center">
                    <div class="text-bold text-red-600">
                        No products found
                    </div>
                </td>
            </tr>
        `;
         return;
        } 
 
        if(result.success){
            updateTable(result.category);
        } 
    } catch (error) {
        console.log("Search product failed:", error.message);
        notyf.error('Search failed');
    }
});

function updateTable(categories){
    const tbody = document.querySelector('tbody')
    tbody.innerHTML=""

    categories?.forEach(category=>{
        tbody.innerHTML += `
            <tr>
               <td class="px-6 py-4 whitespace-nowrap">
                   ${ category.categoryName }
               </td>
               <td class="px-6 py-4">${ category.description }</td>
               <td class="px-6 py-4">12</td>
               <td class="px-6 py-4">
                   <span
                       class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">${ category.categoryName }</span>
               </td>
               <td class="px-6 py-4">
                   <div class="flex gap-2">
                       <a class="text-blue-600 hover:text-blue-800" 
                           name="editButton"
                       href="/admin/edit-category/${ category._id }"
                           >
                           <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                               d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                               </path>
                           </svg>
                       </a>
                   
                       <button onclick="deleteConfirm('${ category._id }')"
                           class="text-red-600 hover:text-red-800" >
                           <svg class="w-5 h-5" fill="none" stroke="currentColor"
                               viewBox="0 0 24 24">
                               <path stroke-linecap="round" stroke-linejoin="round"
                                   stroke-width="2"
                                   d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                               </path>
                           </svg>
                       </button>
                   </div>
               </td> 
           </tr>
        `
    })
}