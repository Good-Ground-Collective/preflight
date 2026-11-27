// Package order keeps track of customer orders.
package order

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"sync"
)

// ErrNotFound reports that no order has the requested ID.
var ErrNotFound = errors.New("order not found")

// ValidationError reports an order that cannot be accepted.
type ValidationError struct {
	Field string
}

func (e *ValidationError) Error() string {
	return "invalid order: " + e.Field
}

// Order is a customer's request for items.
type Order struct {
	ID    string
	Items []string
}

// Store holds orders in memory. The zero value is ready to use.
type Store struct {
	mu     sync.Mutex
	orders map[string]Order
}

// Add records o, replacing any order with the same ID.
func (s *Store) Add(ctx context.Context, o Order) error {
	if o.ID == "" {
		return &ValidationError{Field: "ID"}
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if s.orders == nil {
		s.orders = make(map[string]Order)
	}
	s.orders[o.ID] = o
	slog.InfoContext(ctx, "order added", "id", o.ID, "items", len(o.Items))
	return nil
}

// Find returns the order with the given ID.
func (s *Store) Find(id string) (Order, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	o, ok := s.orders[id]
	if !ok {
		return Order{}, fmt.Errorf("find %s: %w", id, ErrNotFound)
	}
	return o, nil
}

// IDs returns every order ID in sorted order.
func (s *Store) IDs() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	ids := make([]string, 0, len(s.orders))
	for id := range s.orders {
		ids = append(ids, id)
	}
	slices.Sort(ids)
	return ids
}
