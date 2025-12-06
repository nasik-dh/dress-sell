// Configuration
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwbxP0c4eI1KvjrFYazyaqXTOpxF2X0tLuPuDtCmbczOA1V2yMs8aWMc115GMQNA8WIcA/exec';
    const PRODUCTS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRuxfN3pkRvY7gU6w474iyADXj69wz4jVQI0qWMFqqJe0lmKBqSe8Z5yIwNZ5wnPmq_MNWaIjIWE6vo/pub?gid=512772452&single=true&output=csv';
    const ORDERS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRuxfN3pkRvY7gU6w474iyADXj69wz4jVQI0qWMFqqJe0lmKBqSe8Z5yIwNZ5wnPmq_MNWaIjIWE6vo/pub?gid=1214934860&single=true&output=csv';

    // Global variables
    let cart = [];
    let products = [];
    let currentSort = 'featured';
    let currentProductId = null;
    let generatedOrderId = '';

    // Load Products from Google Sheets CSV
    async function loadProducts() {
        const productGrid = document.getElementById('productGrid');
        const loading = document.getElementById('loading');
        
        loading.style.display = 'block';
        productGrid.innerHTML = '';

        try {
            const response = await fetch(PRODUCTS_CSV_URL);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const csvText = await response.text();
            products = parseCSV(csvText);
            
            if (products.length === 0) {
                throw new Error('No products found in CSV');
            }
            
            displayProducts();
            
        } catch (error) {
            console.error('Error loading products:', error);
            showToast('Error loading products. Using sample data.');
            loadSampleProducts();
        } finally {
            loading.style.display = 'none';
        }
    }

    // Parse CSV function
    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] ? values[index].replace(/"/g, '').trim() : '';
                });
                
                const product = {
                    ID: i,
                    Name: row.name || row.Name || '',
                    Category: row.category || row.Category || '',
                    Price: row.price || row.Price || '0',
                    OriginalPrice: row.originalPrice || row.OriginalPrice || '',
                    Image: row.imageUrl || row.Image || row.image || 'https://images.unsplash.com/photo-1560769669-975ec94e6a86?w=500',
                    Badge: row.badge || row.Badge || '',
                    Rating: parseFloat(row.rating || row.Rating || '4'),
                    Reviews: parseInt(row.reviews || row.Reviews || '0'),
                    Description: row.description || row.Description || 'Premium quality product.',
                    Stock: parseInt(row.stock || row.Stock || '0'),
                    Status: row.status || row.Status || 'Active'
                };
                
                if (product.Stock > 0 && product.Status === 'Active') {
                    data.push(product);
                }
            }
        }

        return data;
    }

    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    function displayProducts() {
        const productGrid = document.getElementById('productGrid');
        productGrid.innerHTML = '';

        let filteredProducts = sortProducts(products, currentSort);

        if (filteredProducts.length === 0) {
            productGrid.innerHTML = `
                <div style="text-align: center; grid-column: 1/-1; padding: 60px; color: #666;">
                    <i class="fas fa-search" style="font-size: 50px; margin-bottom: 20px; opacity: 0.4;"></i>
                    <h3 style="font-size: 1.3rem; margin-bottom: 8px;">No products found</h3>
                    <p style="font-size: 14px;">Try adjusting your filters or browse other categories</p>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();
        filteredProducts.forEach(product => {
            const productCard = createProductCard(product);
            fragment.appendChild(productCard);
        });
        productGrid.appendChild(fragment);
    }

    function sortProducts(productsArray, sortBy) {
        switch(sortBy) {
            case 'price-low':
                return [...productsArray].sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price));
            case 'price-high':
                return [...productsArray].sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price));
            case 'newest':
                return [...productsArray].reverse();
            default:
                return productsArray;
        }
    }

    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const stars = '★'.repeat(Math.floor(product.Rating)) + '☆'.repeat(5 - Math.floor(product.Rating));
        const hasDiscount = product.OriginalPrice && parseFloat(product.OriginalPrice) > parseFloat(product.Price);
        
        card.innerHTML = `
            ${product.Badge ? `<div class="product-badge ${product.Badge === 'New' ? 'new' : ''}">${product.Badge}</div>` : ''}
            <div class="product-image">
                <img src="${product.Image}" alt="${product.Name}" onerror="this.src='https://images.unsplash.com/photo-1560769669-975ec94e6a86?w=500'">
                <div class="quick-view">Quick View</div>
            </div>
            <div class="product-info">
                <div class="product-category">${product.Category}</div>
                <div class="product-name">${product.Name}</div>
                <div class="product-rating">
                    <div class="stars">${stars}</div>
                    <span class="rating-count">(${product.Reviews})</span>
                </div>
                <div class="product-price">
                    <span class="current-price">$${parseFloat(product.Price).toFixed(2)}</span>
                    ${hasDiscount ? `<span class="original-price">$${parseFloat(product.OriginalPrice).toFixed(2)}</span>` : ''}
                </div>
                <button class="cart-icon-btn" onclick="event.stopPropagation(); addToCart(${product.ID})">
                    <i class="fas fa-shopping-cart"></i>
                </button>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.cart-icon-btn')) {
                viewProductDetails(product.ID);
            }
        });
        
        return card;
    }

    function viewProductDetails(productId) {
        const product = products.find(p => p.ID === productId);
        if (product) {
            currentProductId = productId;
            
            document.getElementById('modalImage').src = product.Image;
            document.getElementById('modalTitle').textContent = product.Name;
            document.getElementById('modalCategory').textContent = product.Category;
            document.getElementById('modalPrice').textContent = `$${parseFloat(product.Price).toFixed(2)}`;
            
            const hasDiscount = product.OriginalPrice && parseFloat(product.OriginalPrice) > parseFloat(product.Price);
            const originalPriceEl = document.getElementById('modalOriginalPrice');
            if (hasDiscount) {
                originalPriceEl.textContent = `$${parseFloat(product.OriginalPrice).toFixed(2)}`;
                originalPriceEl.style.display = 'inline';
            } else {
                originalPriceEl.style.display = 'none';
            }
            
            const stars = '★'.repeat(Math.floor(product.Rating)) + '☆'.repeat(5 - Math.floor(product.Rating));
            document.querySelector('#modalRating .stars').textContent = stars;
            document.querySelector('#modalRating .rating-count').textContent = `(${product.Reviews})`;
            
            document.getElementById('modalDescription').textContent = product.Description || 'Premium quality product with excellent craftsmanship.';
            
            document.getElementById('productModal').classList.add('active');
        }
    }

    function loadSampleProducts() {
        const sampleProducts = [
            {
                ID: 1,
                Name: "Classic Denim Jacket",
                Category: "men",
                Price: 89.99,
                OriginalPrice: 129.99,
                Image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500",
                Badge: "Sale",
                Rating: 4.5,
                Reviews: 128,
                Description: "Premium quality denim jacket with classic fit.",
                Stock: 50,
                Status: "Active"
            },
            {
                ID: 2,
                Name: "Elegant Summer Dress",
                Category: "women",
                Price: 59.99,
                OriginalPrice: 79.99,
                Image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500",
                Badge: "New",
                Rating: 4.8,
                Reviews: 256,
                Description: "Beautiful summer dress with floral pattern.",
                Stock: 75,
                Status: "Active"
            }
        ];
        
        products = sampleProducts;
        displayProducts();
    }

    function addToCart(productId) {
        const product = products.find(p => p.ID == productId);
        
        if (!product) {
            showToast('Product not found!');
            return;
        }
        
        const existingItem = cart.find(item => item.ID == productId);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({
                ...product,
                quantity: 1,
                size: 'M',
                color: 'Black'
            });
        }

        updateCart();
        showToast(`${product.Name} added!`);
    }

    function updateCart() {
        const cartCount = document.getElementById('cartCount');
        const cartItems = document.getElementById('cartItems');
        const cartFooter = document.getElementById('cartFooter');
        const cartTotal = document.getElementById('cartTotal');

        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;

        if (cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>Your cart is empty</h3>
                    <p>Add some products to get started!</p>
                </div>
            `;
            cartFooter.style.display = 'none';
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <img src="${item.Image}" alt="${item.Name}" class="cart-item-image" onerror="this.src='https://images.unsplash.com/photo-1560769669-975ec94e6a86?w=500'">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.Name}</div>
                        <div class="cart-item-price">$${parseFloat(item.Price).toFixed(2)}</div>
                        <div class="quantity-controls">
                            <button class="qty-btn" onclick="updateQuantity(${item.ID}, -1)">-</button>
                            <span style="min-width: 30px; text-align: center; font-weight: 600;">${item.quantity}</span>
                            <button class="qty-btn" onclick="updateQuantity(${item.ID}, 1)">+</button>
                        </div>
                    </div>
                    <button class="remove-item" onclick="removeFromCart(${item.ID})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
            
            const total = cart.reduce((sum, item) => sum + (parseFloat(item.Price) * item.quantity), 0);
            cartTotal.textContent = `$${total.toFixed(2)}`;
            document.getElementById('checkoutTotal').textContent = `$${total.toFixed(2)}`;
            cartFooter.style.display = 'block';
        }
    }

    function updateQuantity(productId, change) {
        const item = cart.find(item => item.ID == productId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                removeFromCart(productId);
            } else {
                updateCart();
            }
        }
    }

    function removeFromCart(productId) {
        cart = cart.filter(item => item.ID != productId);
        updateCart();
        showToast('Item removed');
    }

    function generateOrderId() {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `ORD-${timestamp}-${randomStr}`;
    }

    async function submitOrder(orderData) {
        try {
            const params = new URLSearchParams({
                action: 'submitOrder',
                orderId: orderData.orderId,
                customerName: orderData.customerName,
                email: orderData.email,
                phone: orderData.phone,
                address: orderData.address,
                paymentMethod: orderData.paymentMethod,
                products: orderData.products,
                total: orderData.total,
                status: orderData.status
            });

            const url = `${GOOGLE_SCRIPT_URL}?${params.toString()}`;
            
            const response = await fetch(url, {
                method: 'GET',
                redirect: 'follow'
            });

            const text = await response.text();
            const result = JSON.parse(text);

            if (result.status === 'success') {
                return {
                    success: true,
                    orderId: result.orderId
                };
            } else {
                throw new Error(result.message || 'Order submission failed');
            }
        } catch (error) {
            console.error('Error submitting order:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async function trackOrders() {
        const phoneInput = document.getElementById('trackPhone');
        const phone = phoneInput.value.trim();
        const orderResults = document.getElementById('orderResults');

        if (!phone) {
            showToast('Please enter a phone number');
            return;
        }

        orderResults.innerHTML = '<div style="text-align: center; padding: 30px;"><div class="spinner"></div><p>Searching orders...</p></div>';
        orderResults.classList.add('active');

        try {
            const response = await fetch(ORDERS_CSV_URL);
            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }

            const csvText = await response.text();
            const orders = parseOrdersCSV(csvText);
            
            const userOrders = orders.filter(order => order.phone === phone);

            if (userOrders.length === 0) {
                orderResults.innerHTML = `
                    <div class="no-orders">
                        <i class="fas fa-inbox"></i>
                        <h3>No Orders Found</h3>
                        <p>No orders found for this phone number</p>
                    </div>
                `;
                return;
            }

            orderResults.innerHTML = userOrders.map(order => {
                const productsRaw = order.products || '';
                
                return `
                    <div class="order-card">
                        <div class="order-header">
                            <span class="order-id-display">${order.orderId}</span>
                            <span class="order-status ${order.status.toLowerCase()}">${order.status}</span>
                        </div>
                        <div class="order-info-row">
                            <span class="order-info-label">Name:</span>
                            <span class="order-info-value">${order.customerName}</span>
                        </div>
                        <div class="order-info-row">
                            <span class="order-info-label">Email:</span>
                            <span class="order-info-value">${order.email}</span>
                        </div>
                        <div class="order-info-row">
                            <span class="order-info-label">Address:</span>
                            <span class="order-info-value">${order.address}</span>
                        </div>
                        <div class="order-info-row">
                            <span class="order-info-label">Payment:</span>
                            <span class="order-info-value">${order.paymentMethod}</span>
                        </div>
                        <div class="order-info-row">
                            <span class="order-info-label">Total:</span>
                            <span class="order-info-value">$${parseFloat(order.total).toFixed(2)}</span>
                        </div>
                        <div class="order-products">
                            <h4>Products:</h4>
                            <div class="order-product-item">
                                ${productsRaw.replace(/\n/g, '<br>')}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Error tracking orders:', error);
            orderResults.innerHTML = `
                <div class="no-orders">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error</h3>
                    <p>Failed to load orders. Please try again.</p>
                </div>
            `;
        }
    }

    function parseOrdersCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length >= headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                
                const order = {
                    orderId: row.orderId || row.OrderId || row['Order ID'] || '',
                    customerName: row.customerName || row.CustomerName || row['Customer Name'] || '',
                    email: row.email || row.Email || '',
                    phone: row.phone || row.Phone || '',
                    address: row.address || row.Address || '',
                    paymentMethod: row.paymentMethod || row.PaymentMethod || row['Payment Method'] || '',
                    products: row.products || row.Products || '',
                    total: row.total || row.Total || row['Total Amount'] || '0',
                    status: row.status || row.Status || 'Pending'
                };
                
                data.push(order);
            }
        }

        return data;
    }

    function searchProducts(query) {
        const searchResults = document.getElementById('searchResults');
        
        if (!query.trim()) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Start typing to search products...</p>
                </div>
            `;
            return;
        }

        const results = products.filter(product => 
            product.Name.toLowerCase().includes(query.toLowerCase()) ||
            product.Category.toLowerCase().includes(query.toLowerCase()) ||
            product.Description.toLowerCase().includes(query.toLowerCase())
        );

        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No products found for "${query}"</p>
                </div>
            `;
            return;
        }

        searchResults.innerHTML = results.map(product => `
            <div class="search-result-item" onclick="viewProductDetails(${product.ID}); closeSearch();">
                <img src="${product.Image}" alt="${product.Name}" class="search-result-image" onerror="this.src='https://images.unsplash.com/photo-1560769669-975ec94e6a86?w=500'">
                <div class="search-result-info">
                    <div class="search-result-category">${product.Category}</div>
                    <div class="search-result-name">${product.Name}</div>
                    <div class="search-result-price">$${parseFloat(product.Price).toFixed(2)}</div>
                </div>
            </div>
        `).join('');
    }

    function copyOrderId() {
        const orderIdText = document.getElementById('displayOrderId').textContent;
        navigator.clipboard.writeText(orderIdText).then(() => {
            showToast('Order ID copied!');
        });
    }

    function closeSuccessModal() {
        document.getElementById('successModal').classList.remove('active');
    }

    function closeSearch() {
        document.getElementById('searchModal').classList.remove('active');
        document.getElementById('searchInput').value = '';
    }

    function scrollToSection(section) {
        document.getElementById('sideMenu').classList.remove('active');
        if (section === 'home') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('active');
        setTimeout(() => {
            toast.classList.remove('active');
        }, 2500);
    }

    // Event Listeners
    document.addEventListener('DOMContentLoaded', () => {
        loadProducts();
        
        // Setup dropdowns
        function setupDropdowns(sortId) {
            const sortDropdown = document.getElementById(sortId);

            sortDropdown.addEventListener('click', function(e) {
                e.stopPropagation();
                this.classList.toggle('active');
            });

            sortDropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', function() {
                    document.querySelectorAll('[id^="sortDropdown"] .dropdown-item').forEach(i => i.classList.remove('active'));
                    document.querySelectorAll(`[data-sort="${this.dataset.sort}"]`).forEach(i => i.classList.add('active'));
                    currentSort = this.dataset.sort;
                    displayProducts();
                });
            });
        }

        setupDropdowns('sortDropdown');
        setupDropdowns('sortDropdownProducts');

        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        });

        // Search
        document.getElementById('searchIcon').addEventListener('click', () => {
            document.getElementById('searchModal').classList.add('active');
            document.getElementById('searchInput').focus();
        });

        document.getElementById('closeSearch').addEventListener('click', closeSearch);

        document.getElementById('searchModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('searchModal')) {
                closeSearch();
            }
        });

        document.getElementById('searchInput').addEventListener('input', (e) => {
            searchProducts(e.target.value);
        });

        // Cart
        document.getElementById('cartIcon').addEventListener('click', () => {
            document.getElementById('cartSidebar').classList.add('active');
        });

        document.getElementById('closeCart').addEventListener('click', () => {
            document.getElementById('cartSidebar').classList.remove('active');
        });

        // Menu
        document.getElementById('menuIcon').addEventListener('click', () => {
            document.getElementById('sideMenu').classList.add('active');
        });

        document.getElementById('closeMenu').addEventListener('click', () => {
            document.getElementById('sideMenu').classList.remove('active');
        });

        // Profile
        document.getElementById('profileIcon').addEventListener('click', () => {
            document.getElementById('profileModal').classList.add('active');
        });

        document.getElementById('closeProfile').addEventListener('click', () => {
            document.getElementById('profileModal').classList.remove('active');
            document.getElementById('orderResults').classList.remove('active');
            document.getElementById('trackPhone').value = '';
        });

        document.getElementById('profileModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('profileModal')) {
                document.getElementById('profileModal').classList.remove('active');
                document.getElementById('orderResults').classList.remove('active');
                document.getElementById('trackPhone').value = '';
            }
        });

        // Product modal
        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('productModal').classList.remove('active');
        });

        document.getElementById('productModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('productModal')) {
                document.getElementById('productModal').classList.remove('active');
            }
        });

        document.getElementById('modalAddToCart').addEventListener('click', () => {
            if (currentProductId) {
                addToCart(currentProductId);
                document.getElementById('productModal').classList.remove('active');
            }
        });

        // Buy Now
        document.getElementById('buyNowBtn').addEventListener('click', () => {
            if (cart.length === 0) {
                showToast('Your cart is empty!');
                return;
            }
            document.getElementById('checkoutModal').classList.add('active');
            document.getElementById('cartSidebar').classList.remove('active');
        });

        // Checkout modal
        document.getElementById('closeCheckout').addEventListener('click', () => {
            document.getElementById('checkoutModal').classList.remove('active');
        });

        document.getElementById('checkoutModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('checkoutModal')) {
                document.getElementById('checkoutModal').classList.remove('active');
            }
        });

        // Submit order
        document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const customerName = document.getElementById('customerName').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const address = document.getElementById('address').value.trim();
            const paymentMethod = document.getElementById('paymentMethod').value;
            
            if (!customerName || !email || !phone || !address || !paymentMethod) {
                showToast('Please fill all fields!');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showToast('Please enter a valid email!');
                return;
            }

            const orderId = generateOrderId();
            generatedOrderId = orderId;
            const total = cart.reduce((sum, item) => sum + (parseFloat(item.Price) * item.quantity), 0);

            const orderData = {
                orderId: orderId,
                customerName: customerName,
                email: email,
                phone: phone, 
                address: address,
                paymentMethod: paymentMethod,
                products: JSON.stringify(cart),
                total: total.toFixed(2),
                status: 'Pending'
            };

            const submitBtn = e.target.querySelector('.submit-order-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            submitBtn.disabled = true;

            try {
                const result = await submitOrder(orderData);

                if (result.success) {
                    document.getElementById('displayOrderId').textContent = orderId;
                    document.getElementById('checkoutModal').classList.remove('active');
                    document.getElementById('successModal').classList.add('active');
                    
                    cart = [];
                    updateCart();
                    
                    document.getElementById('checkoutForm').reset();
                } else {
                    throw new Error(result.error || 'Order submission failed');
                }
            } catch (error) {
                console.error('Order submission error:', error);
                showToast('Error submitting order. Please try again.');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            const cartSidebar = document.getElementById('cartSidebar');
            const cartIcon = document.getElementById('cartIcon');
            if (cartSidebar.classList.contains('active') && 
                !cartSidebar.contains(e.target) && 
                !cartIcon.contains(e.target)) {
                cartSidebar.classList.remove('active');
            }

            const sideMenu = document.getElementById('sideMenu');
            const menuIcon = document.getElementById('menuIcon');
            if (sideMenu.classList.contains('active') && 
                !sideMenu.contains(e.target) && 
                !menuIcon.contains(e.target)) {
                sideMenu.classList.remove('active');
            }
        });
    });
