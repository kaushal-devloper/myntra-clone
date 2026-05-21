import { useRouter } from 'expo-router';
import { ChevronRight, CreditCard, MapPin, Truck } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type TimelineEvent = {
  status: string;
  location: string;
  timestamp: string;
};

type OrderItem = {
  id: number;
  name: string;
  brand: string;
  size: string;
  price: number;
  image: string;
};

type Order = {
  id: string;
  date: string;
  status: string;
  items: OrderItem[];
  total: number;
  shippingAddress: string;
  paymentMethod: string;
  tracking: {
    number: string;
    carrier: string;
    estimatedDelivery: string;
    currentLocation: string;
    status: string;
    timeline: TimelineEvent[];
  };
};

const ordersSeed: Order[] = [
  {
    id: 'ORD123456',
    date: '15 Mar 2024',
    status: 'Delivered',
    items: [
      {
        id: 1,
        name: 'White Cotton T-Shirt',
        brand: 'H&M',
        size: 'L',
        price: 799,
        image:
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop',
      },
      {
        id: 2,
        name: 'Blue Denim Jacket',
        brand: 'Levis',
        size: 'M',
        price: 2999,
        image:
          'https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?w=500&auto=format&fit=crop',
      },
    ],
    total: 4087,
    shippingAddress: '123 Main Street, Apt 4B, New York, NY 10001',
    paymentMethod: 'Credit Card ending in 4242',
    tracking: {
      number: 'TRK789012345',
      carrier: 'FedEx',
      estimatedDelivery: '15 Mar 2024',
      currentLocation: 'New York City Hub',
      status: 'Delivered',
      timeline: [
        {
          status: 'Delivered',
          location: 'New York, NY',
          timestamp: '15 Mar 2024, 14:30',
        },
        {
          status: 'Out for Delivery',
          location: 'New York City Hub',
          timestamp: '15 Mar 2024, 09:15',
        },
        {
          status: 'Arrived at Delivery Facility',
          location:
            'New York Distribution Center',
          timestamp: '14 Mar 2024, 23:45',
        },
        {
          status: 'Order Shipped',
          location: 'New Jersey Warehouse',
          timestamp: '13 Mar 2024, 16:20',
        },
        {
          status: 'Order Confirmed',
          location: 'Online',
          timestamp: '12 Mar 2024, 10:00',
        },
      ],
    },
  },
  {
    id: 'ORD123457',
    date: '10 Mar 2024',
    status: 'Delivered',
    items: [
      {
        id: 3,
        name: 'Summer Dress',
        brand: 'ONLY',
        size: 'S',
        price: 1299,
        image:
          'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&auto=format&fit=crop',
      },
    ],
    total: 1398,
    shippingAddress: '123 Main Street, Apt 4B, New York, NY 10001',
    paymentMethod: 'Credit Card ending in 4242',
    tracking: {
      number: 'TRK789012346',
      carrier: 'UPS',
      estimatedDelivery: '10 Mar 2024',
      currentLocation: 'Delivered',
      status: 'Delivered',
      timeline: [
        {
          status: 'Delivered',
          location: 'New York, NY',
          timestamp: '10 Mar 2024, 15:45',
        },
        {
          status: 'Order Shipped',
          location: 'New Jersey Warehouse',
          timestamp: '08 Mar 2024, 11:30',
        },
        {
          status: 'Order Confirmed',
          location: 'Online',
          timestamp: '07 Mar 2024, 09:15',
        },
      ],
    },
  },
];

export default function Orders() {
  const router = useRouter();
  void router;

  const orders = useMemo(() => ordersSeed, []);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {orders.map((order) => {
          const isExpanded = expandedOrderId === order.id;

          return (
            <View key={order.id} style={styles.orderCard}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => toggleOrderDetails(order.id)}
                style={styles.orderRow}
              >
                <View style={styles.orderTopLeft}>
                  <Text style={styles.orderId}>Order ID: {order.id}</Text>
                  <Text style={styles.orderDate}>{order.date}</Text>
                  <Text style={styles.orderStatus}>{order.status}</Text>
                </View>

                <View style={styles.orderTopRight}>
                  <Text style={styles.orderTotal}>₹{order.total}</Text>
                  <ChevronRight
                    size={20}
                    color={isExpanded ? '#ff3f6c' : '#3e3e3e'}
                    style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] } as any}
                  />
                </View>
              </TouchableOpacity>

              <View style={styles.itemsRow}>
                {order.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemBrand}>{item.brand}</Text>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.itemMeta}>Size: {item.size}</Text>
                      <Text style={styles.itemPrice}>₹{item.price}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {isExpanded && (
                <View style={styles.orderDetails}>
                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <MapPin size={20} color="#3e3e3e" />
                      <Text style={styles.detailTitle}>Shipping Address</Text>
                    </View>
                    <Text style={styles.detailText}>{order.shippingAddress}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <CreditCard size={20} color="#3e3e3e" />
                      <Text style={styles.detailTitle}>Payment Method</Text>
                    </View>
                    <Text style={styles.detailText}>{order.paymentMethod}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <Truck size={20} color="#3e3e3e" />
                      <Text style={styles.detailTitle}>Tracking Information</Text>
                    </View>

                    <View style={styles.trackingInfo}>
                      <Text style={styles.trackingText}>
                        Tracking Number: {order.tracking.number}
                      </Text>
                      <Text style={styles.trackingText}>
                        Carrier: {order.tracking.carrier}
                      </Text>
                      <Text style={styles.trackingText}>
                        Current: {order.tracking.currentLocation}
                      </Text>
                    </View>

                    <View style={styles.timeline}>
                      {order.tracking.timeline.map((event, index) => (
                        <View key={`${order.id}-${index}`} style={styles.timelineEvent}>
                          <View style={styles.timelinePoint} />
                          <View style={styles.timelineContent}>
                            <Text style={styles.timelineStatus}>{event.status}</Text>
                            <Text style={styles.timelineLocation}>{event.location}</Text>
                            <Text style={styles.timelineTimestamp}>{event.timestamp}</Text>
                          </View>
                          {index !== order.tracking.timeline.length - 1 && (
                            <View style={styles.timelineLine} />
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.orderFooter}>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Order Total</Text>
                  <Text style={styles.totalAmount}>₹{order.total}</Text>
                </View>

                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={() => toggleOrderDetails(order.id)}
                >
                  <Text style={styles.detailsButtonText}>
                    {isExpanded ? 'Hide Details' : 'View Details'}
                  </Text>
                  <ChevronRight size={20} color="#ff3f6c" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
  scrollContent: { padding: 16, gap: 14 },
  orderCard: {
    borderWidth: 1,
    borderColor: '#efefef',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  orderRow: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  orderTopLeft: { flex: 1 },
  orderId: { fontSize: 14, fontWeight: '700', color: '#111' },
  orderDate: { fontSize: 13, color: '#666', marginTop: 4 },
  orderStatus: { fontSize: 13, color: '#00b53f', fontWeight: '700', marginTop: 4 },
  orderTopRight: { alignItems: 'flex-end', gap: 6 },
  orderTotal: { fontSize: 14, fontWeight: '900', color: '#ff3f6c' },
  itemsRow: { paddingHorizontal: 14, paddingBottom: 12, gap: 10 },
  itemRow: { flexDirection: 'row', gap: 10 },
  itemImage: { width: 70, height: 70, borderRadius: 10, backgroundColor: '#fafafa' },
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemBrand: { fontSize: 12, color: '#ff3f6c', fontWeight: '800' },
  itemName: { fontSize: 14, color: '#111', fontWeight: '700', marginTop: 2 },
  itemMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  itemPrice: { fontSize: 13, color: '#111', fontWeight: '800', marginTop: 4 },
  orderDetails: { borderTopWidth: 1, borderTopColor: '#f2f2f2', padding: 14, gap: 12 },
  detailSection: { gap: 8 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailTitle: { fontSize: 15, fontWeight: '800', color: '#111' },
  detailText: { fontSize: 13, color: '#333', lineHeight: 18 },
  trackingInfo: { gap: 4 },
  trackingText: { fontSize: 13, color: '#333', fontWeight: '600' },
  timeline: { marginTop: 8, gap: 10 },
  timelineEvent: { position: 'relative' as any, flexDirection: 'row', gap: 10 },
  timelinePoint: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff3f6c', marginTop: 4 },
  timelineContent: { flex: 1 },
  timelineStatus: { fontSize: 13, fontWeight: '800', color: '#111' },
  timelineLocation: { fontSize: 12, color: '#555', marginTop: 2 },
  timelineTimestamp: { fontSize: 12, color: '#888', marginTop: 2 },
  timelineLine: { width: 2, backgroundColor: '#f2f2f2', position: 'absolute' as any, left: 4, top: 18, bottom: -10 },
  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f2f2f2',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  totalContainer: { flex: 1 },
  totalLabel: { fontSize: 12, color: '#666', fontWeight: '700' },
  totalAmount: { fontSize: 16, fontWeight: '900', color: '#ff3f6c', marginTop: 4 },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff3f6c',
  },
  detailsButtonText: { fontSize: 13, fontWeight: '900', color: '#ff3f6c' },
});

