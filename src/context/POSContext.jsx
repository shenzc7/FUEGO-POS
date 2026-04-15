/* eslint-disable react-refresh/only-export-components */
import { createContext, startTransition, useContext, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { cn } from '../utils/cn';
import { 
  toNumber, 
  normalizeMenuItem, 
  normalizeOrder, 
  normalizeLedgerAdjustment, 
  sortMenuItems, 
  buildReceiptSnapshot, 
  mergeSettlementPayment,
  scheduleBrowserPrint
} from '../utils/pos';
import { openReportPrintWindow } from '../utils/reports';

const POSContext = createContext(null);

const DEFAULT_SETTINGS = {
  restaurantName: 'FUEGO',
  gstEnabled: false,
  gstNumber: '',
  gstRate: 5,
  logo: null,
  address: '123 Oven Street, Crust City',
  phone: '+91 9876543210',
  printerModel: 'RP326',
  paperWidth: '80mm (3")',
  pincode: '',
  pincodeEnabled: false,
};

const DEFAULT_DISCOUNT = {
  type: 'percentage',
  value: 0,
};

const API_HOST =
  typeof window !== 'undefined' && window.location.protocol !== 'file:' && window.location.hostname
    ? window.location.hostname
    : '127.0.0.1';

const API_URL = import.meta.env.VITE_API_URL || `http://${API_HOST}:3001`;

const createDefaultSettings = () => ({
  ...DEFAULT_SETTINGS,
});

const createDefaultDiscount = () => ({
  ...DEFAULT_DISCOUNT,
});

const createApiError = async (response) => {
  let message = `Request failed with status ${response.status}`;

  try {
    const payload = await response.json();
    message = payload.error || payload.message || message;
  } catch {
    // Keep the default message when the response body is empty or invalid JSON.
  }

  const error = new Error(message);
  error.status = response.status;
  return error;
};

const apiJson = async (path, options = {}) => {
  const headers = new Headers(options.headers ?? {});
  const hasBody = options.body !== undefined;

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

export const POSProvider = ({ children }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ledgerAdjustments, setLedgerAdjustments] = useState([]);
  const [settings, setSettingsState] = useState(createDefaultSettings);
  const [theme, setTheme] = useLocalStorage('fuego_theme', 'dark');
  const [activeView, setActiveView] = useState('POS');
  const [parkedOrders, setParkedOrders] = useLocalStorage('fuego_parked_orders', []);
  const [cart, setCart] = useState([]);
  const [draftOrderId, setDraftOrderId] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [discount, setDiscount] = useState(createDefaultDiscount);
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [settlementOrder, setSettlementOrder] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [printingData, setPrintingData] = useState(null);
  const [printingType, setPrintingType] = useState('INVOICE');
  // Server-side aggregate — covers ALL historical records regardless of the
  // in-memory orders slice. Used by the Finance page for the balance cards.
  const [financeServerSummary, setFinanceServerSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      apiJson('/menu'),
      // Load the 500 most-recent orders — enough for the POS and recent history.
      // The Finance page uses /finance/summary for accurate all-time totals.
      apiJson('/orders?limit=500'),
      apiJson('/settings'),
      apiJson('/ledger-adjustments'),
      apiJson('/finance/summary'),
    ]).then((results) => {
      if (cancelled) {
        return;
      }

      startTransition(() => {
        const [menuResult, ordersResult, settingsResult, adjustmentsResult, summaryResult] = results;

        if (menuResult.status === 'fulfilled') {
          setMenuItems(sortMenuItems(menuResult.value.map(normalizeMenuItem)));
        } else {
          console.error('Failed to load menu items:', menuResult.reason);
        }

        if (ordersResult.status === 'fulfilled') {
          setOrders(ordersResult.value.map(normalizeOrder));
        } else {
          console.error('Failed to load orders:', ordersResult.reason);
        }

        if (settingsResult.status === 'fulfilled' && settingsResult.value) {
          setSettingsState((previous) => ({
            ...previous,
            ...settingsResult.value,
          }));
        } else if (settingsResult.status === 'rejected') {
          console.error('Failed to load settings:', settingsResult.reason);
        }

        if (adjustmentsResult.status === 'fulfilled') {
          setLedgerAdjustments(adjustmentsResult.value.map(normalizeLedgerAdjustment));
        } else {
          console.error('Failed to load ledger adjustments:', adjustmentsResult.reason);
        }

        if (summaryResult.status === 'fulfilled' && summaryResult.value) {
          setFinanceServerSummary(summaryResult.value);
        } else if (summaryResult.status === 'rejected') {
          console.error('Failed to load finance summary:', summaryResult.reason);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!printingData) {
      return undefined;
    }

    // Guard: never attempt to print an order with no items — just clear state.
    if (!Array.isArray(printingData.items) || printingData.items.length === 0) {
      setPrintingData(null);
      return undefined;
    }

    const cancel = scheduleBrowserPrint(() => {
      setPrintingData(null);
    });

    // Failsafe: if the browser never fires `afterprint` (some environments skip
    // it), clear the print state after 60 seconds so the app doesn't get stuck.
    const failsafeTimer = window.setTimeout(() => {
      setPrintingData(null);
    }, 60_000);

    return () => {
      cancel();
      window.clearTimeout(failsafeTimer);
    };
  }, [printingData]);

  const toggleTheme = () => {
    setTheme((previousTheme) => (previousTheme === 'dark' ? 'light' : 'dark'));
  };

  const addToCart = (item) => {
    if (!draftOrderId) {
      setDraftOrderId(generateOrderId());
    }

    setCart((previousCart) => {
      const existing = previousCart.find((cartItem) => cartItem.id === item.id);

      if (existing) {
        return previousCart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
      }

      return [...previousCart, { ...item, quantity: 1, note: '' }];
    });
  };

  const removeFromCart = (id) => {
    setCart((previousCart) => {
      const nextCart = previousCart.filter((item) => item.id !== id);

      if (nextCart.length === 0) {
        setDraftOrderId('');
      }

      return nextCart;
    });
  };

  const updateQuantity = (id, delta) => {
    setCart((previousCart) =>
      previousCart.map((item) => {
        if (item.id !== id) {
          return item;
        }

        return {
          ...item,
          quantity: Math.max(1, item.quantity + delta),
        };
      }),
    );
  };

  const updateItemNote = (id, note) => {
    setCart((previousCart) =>
      previousCart.map((item) => (item.id === id ? { ...item, note } : item)),
    );
  };

  const clearCart = () => {
    setCart([]);
    setDraftOrderId('');
    setOrderNote('');
    setTableNumber('');
    setCustomerName('');
    setCustomerPhone('');
    setDiscount(createDefaultDiscount());
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );

  const discountAmount = useMemo(() => {
    if (discount.type === 'percentage') {
      return (subtotal * discount.value) / 100;
    }

    return Math.min(subtotal, discount.value);
  }, [discount, subtotal]);

  const afterDiscount = subtotal - discountAmount;
  const gst = settings.gstEnabled ? (afterDiscount * settings.gstRate) / 100 : 0;
  const total = afterDiscount + gst;

  const getReservedOrderIds = () =>
    [
      ...orders.map((order) => order.id),
      ...parkedOrders.map((order) => order.orderId).filter(Boolean),
      draftOrderId,
    ].filter(Boolean);

  const generateOrderId = (reservedIds = getReservedOrderIds()) => {
    const now = new Date();
    const prefix = [
      String(now.getDate()).padStart(2, '0'),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getFullYear()).slice(-2),
    ].join('-');

    const highestSequence = reservedIds.reduce((highest, orderId) => {
      if (!orderId?.startsWith(`${prefix}-`)) {
        return highest;
      }

      const sequence = Number(orderId.split('-').pop());
      return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
    }, 0);

    return `${prefix}-${String(highestSequence + 1).padStart(4, '0')}`;
  };

  const ensureDraftOrderId = () => {
    if (draftOrderId) {
      return draftOrderId;
    }

    const nextId = generateOrderId();
    setDraftOrderId(nextId);
    return nextId;
  };

  const currentOrderId = draftOrderId || generateOrderId();

  const completeOrder = async (paymentDetails) => {
    const orderId = ensureDraftOrderId();
    const newOrder = {
      id: orderId,
      items: [...cart],
      subtotal,
      discount: discountAmount,
      gst,
      total,
      tableNumber,
      customerName,
      customerPhone,
      note: orderNote,
      payment: paymentDetails,
      receiptSettings: buildReceiptSnapshot(settings, DEFAULT_SETTINGS),
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await apiJson('/orders', {
        method: 'POST',
        body: JSON.stringify(newOrder),
      });

      const savedOrder = normalizeOrder(response.order);
      setOrders((previousOrders) => [savedOrder, ...previousOrders]);
      clearCart();
      refreshFinanceSummary();
      return savedOrder;
    } catch (error) {
      console.error('Failed to save order:', error);
      window.alert(error.message || 'Error saving order to the local database.');
      return null;
    }
  };

  const updateOrder = async (orderId, updatedFields) => {
    try {
      const response = await apiJson(`/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedFields),
      });

      const savedOrder = normalizeOrder(response.order);
      setOrders((previousOrders) =>
        previousOrders.map((order) => (order.id === orderId ? savedOrder : order)),
      );

      if (settlementOrder?.id === orderId) {
        setSettlementOrder(savedOrder);
      }

      return savedOrder;
    } catch (error) {
      console.error('Failed to update order:', error);
      window.alert(error.message || 'Error updating the order.');
      return null;
    }
  };

  const settleOrder = async (orderId, paymentDetails) => {
    const existingOrder = orders.find((order) => order.id === orderId);
    if (!existingOrder) {
      return null;
    }

    const saved = await updateOrder(orderId, {
      mergePayment: true,
      payment: mergeSettlementPayment(existingOrder.payment, paymentDetails, existingOrder.total),
    });
    if (saved) refreshFinanceSummary();
    return saved;
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm('Delete this record permanently?')) {
      return false;
    }

    try {
      await apiJson(`/orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
      });

      setOrders((previousOrders) => previousOrders.filter((order) => order.id !== orderId));

      if (settlementOrder?.id === orderId) {
        setSettlementOrder(null);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete order:', error);
      window.alert(error.message || 'Error deleting the order.');
      return false;
    }
  };

  const parkCurrentOrder = () => {
    if (cart.length === 0) {
      return;
    }

    const reservedOrderId = ensureDraftOrderId();
    const parkedOrder = {
      id: `PARK-${Date.now()}`,
      orderId: reservedOrderId,
      cart: [...cart],
      customerName,
      customerPhone,
      tableNumber,
      orderNote,
      discount: { ...discount },
      timestamp: new Date().toISOString(),
      subtotal,
      discountAmount,
      total,
    };

    setParkedOrders((previousParkedOrders) => [...previousParkedOrders, parkedOrder]);
    clearCart();
  };

  const resumeOrder = (parkedId) => {
    const parkedOrder = parkedOrders.find((order) => order.id === parkedId);
    if (!parkedOrder) {
      return;
    }

    setCart(parkedOrder.cart);
    setDraftOrderId(parkedOrder.orderId || generateOrderId());
    setCustomerName(parkedOrder.customerName || '');
    setCustomerPhone(parkedOrder.customerPhone || '');
    setTableNumber(parkedOrder.tableNumber || '');
    setOrderNote(parkedOrder.orderNote || '');
    setDiscount(parkedOrder.discount || createDefaultDiscount());
    setParkedOrders((previousParkedOrders) =>
      previousParkedOrders.filter((order) => order.id !== parkedId),
    );
  };

  const deleteParkedOrder = (parkedId) => {
    setParkedOrders((previousParkedOrders) =>
      previousParkedOrders.filter((order) => order.id !== parkedId),
    );
  };

  const resetDatabase = async () => {
    if (!window.confirm('Are you sure you want to reset the database? This will clear all orders and settings.')) {
      return false;
    }

    try {
      await apiJson('/reset', { method: 'POST' });
      setOrders([]);
      setLedgerAdjustments([]);
      setSettingsState(createDefaultSettings());
      setParkedOrders([]);
      clearCart();
      setSettlementOrder(null);
      setIsPaymentModalOpen(false);
      setPrintingData(null);
      return true;
    } catch (error) {
      console.error('Reset failed:', error);
      window.alert(error.message || 'Reset failed.');
      return false;
    }
  };

  const printOrder = (order, type = 'INVOICE') => {
    setPrintingType(type);
    setPrintingData(
      normalizeOrder({
        ...order,
        receiptSettings: order.receiptSettings || buildReceiptSnapshot(settings, DEFAULT_SETTINGS),
      }),
    );
  };

  const exportReport = (title, data, headers) => {
    openReportPrintWindow(title, data, headers);
  };

  const saveSettings = async (newSettings) => {
    const previousSettings = settings;
    const sanitizedSettings = {
      ...DEFAULT_SETTINGS,
      ...newSettings,
      gstEnabled: Boolean(newSettings.gstEnabled),
      gstRate: toNumber(newSettings.gstRate, DEFAULT_SETTINGS.gstRate),
    };

    // Optimistic update
    setSettingsState(sanitizedSettings);

    try {
      await apiJson('/settings', {
        method: 'POST',
        body: JSON.stringify(sanitizedSettings),
      });

      return sanitizedSettings;
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Rollback on failure
      setSettingsState(previousSettings);
      window.alert(error.message || 'Error saving settings. Changes rolled back.');
      throw error;
    }
  };

  const refreshFinanceSummary = async () => {
    try {
      const summary = await apiJson('/finance/summary');
      if (summary) setFinanceServerSummary(summary);
    } catch (error) {
      console.error('Failed to refresh finance summary:', error);
    }
  };

  const addLedgerAdjustment = async (adjustment) => {
    const payload = adjustment.type === 'Transfer' ? {
      ...adjustment,
      amount: Number(adjustment.amount)
    } : normalizeLedgerAdjustment(adjustment);

    try {
      const response = await apiJson('/ledger-adjustments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response && response.adjustments) {
        const savedAdjustments = response.adjustments.map(normalizeLedgerAdjustment);
        setLedgerAdjustments((previousAdjustments) => [...savedAdjustments, ...previousAdjustments]);
        refreshFinanceSummary();
        return savedAdjustments[0];
      }

      if (response && response.adjustment) {
        const savedAdjustment = normalizeLedgerAdjustment(response.adjustment);
        setLedgerAdjustments((previousAdjustments) => [savedAdjustment, ...previousAdjustments]);
        refreshFinanceSummary();
        return savedAdjustment;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to save ledger adjustment:', error);
      window.alert(error.message || 'Error saving the manual adjustment.');
      return null;
    }
  };

  const deleteLedgerAdjustment = async (adjustmentId) => {
    try {
      await apiJson(`/ledger-adjustments/${encodeURIComponent(adjustmentId)}`, {
        method: 'DELETE',
      });

      setLedgerAdjustments((previousAdjustments) =>
        previousAdjustments.filter((adjustment) => adjustment.id !== adjustmentId),
      );
      // Keep server-side totals in sync after every adjustment.
      refreshFinanceSummary();
      return true;
    } catch (error) {
      console.error('Failed to delete ledger adjustment:', error);
      window.alert(error.message || 'Error deleting the manual adjustment.');
      return false;
    }
  };

  const upsertMenuItem = async (item) => {
    const normalizedItem = normalizeMenuItem(item);
    const exists = menuItems.some((menuItem) => menuItem.id === normalizedItem.id);
    const method = exists ? 'PUT' : 'POST';
    const path = exists ? `/menu/${encodeURIComponent(normalizedItem.id)}` : '/menu';

    const response = await apiJson(path, {
      method,
      body: JSON.stringify(normalizedItem),
    });

    const savedItem = normalizeMenuItem(response.item);

    setMenuItems((previousMenuItems) =>
      sortMenuItems([
        savedItem,
        ...previousMenuItems.filter((menuItem) => menuItem.id !== savedItem.id),
      ]),
    );

    return savedItem;
  };

  const toggleMenuItemStatus = async (itemId) => {
    const targetItem = menuItems.find((menuItem) => menuItem.id === itemId);
    if (!targetItem) {
      return null;
    }

    return upsertMenuItem({
      ...targetItem,
      active: !targetItem.active,
    });
  };

  const removeMenuItem = async (itemId) => {
    await apiJson(`/menu/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
    });

    setMenuItems((previousMenuItems) =>
      previousMenuItems.filter((menuItem) => menuItem.id !== itemId),
    );
    setCart((previousCart) => previousCart.filter((item) => item.id !== itemId));
  };

  const value = {
    menuItems,
    orders,
    ledgerAdjustments,
    settings,
    activeView,
    setActiveView,
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateItemNote,
    clearCart,
    orderNote,
    setOrderNote,
    tableNumber,
    setTableNumber,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    currentOrderId,
    discount,
    setDiscount,
    subtotal,
    discountAmount,
    gst,
    total,
    completeOrder,
    settleOrder,
    updateOrder,
    deleteOrder,
    printingData,
    printingType,
    printOrder,
    exportReport,
    settlementOrder,
    setSettlementOrder,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    parkedOrders,
    parkCurrentOrder,
    resumeOrder,
    deleteParkedOrder,
    theme,
    toggleTheme,
    resetDatabase,
    saveSettings,
    addLedgerAdjustment,
    deleteLedgerAdjustment,
    upsertMenuItem,
    toggleMenuItemStatus,
    removeMenuItem,
    financeServerSummary,
    cn,
  };

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
};

export const usePOS = () => {
  const context = useContext(POSContext);

  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }

  return context;
};
