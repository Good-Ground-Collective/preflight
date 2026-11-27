package order

import (
	"errors"
	"testing"

	"github.com/google/go-cmp/cmp"
)

func TestStoreAdd(t *testing.T) {
	tests := []struct {
		name    string
		order   Order
		wantErr bool
	}{
		{name: "valid", order: Order{ID: "a1", Items: []string{"widget"}}},
		{name: "missing ID", order: Order{}, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var s Store
			err := s.Add(t.Context(), tt.order)
			if got := err != nil; got != tt.wantErr {
				t.Fatalf("Add(%+v) error = %v, wantErr %v", tt.order, err, tt.wantErr)
			}
		})
	}
}

func TestStoreFindMissing(t *testing.T) {
	var s Store
	_, err := s.Find("nope")
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("Find(%q) error = %v, want %v", "nope", err, ErrNotFound)
	}
}

func TestStoreIDs(t *testing.T) {
	var s Store
	for _, id := range []string{"b", "a"} {
		mustAdd(t, &s, Order{ID: id})
	}
	if diff := cmp.Diff([]string{"a", "b"}, s.IDs()); diff != "" {
		t.Errorf("IDs() mismatch (-want +got):\n%s", diff)
	}
}

func mustAdd(t *testing.T, s *Store, o Order) {
	t.Helper()
	if err := s.Add(t.Context(), o); err != nil {
		t.Fatalf("Add(%+v): %v", o, err)
	}
}
