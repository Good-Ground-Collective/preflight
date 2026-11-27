// Package stack provides a last-in, first-out container.
package stack

// Stack is a last-in, first-out collection. The zero value is an empty stack.
type Stack[T any] struct {
	items []T
}

// Push adds v to the top of the stack.
func (s *Stack[T]) Push(v T) {
	s.items = append(s.items, v)
}

// Peek returns the top value without removing it. It panics if the stack is empty.
func (s *Stack[T]) Peek() T {
	return s.items[len(s.items)-1]
}

// Pop removes and returns the top value, reporting false when the stack is empty.
func (s *Stack[T]) Pop() (T, bool) {
	var zero T
	if len(s.items) == 0 {
		return zero, false
	}
	v := s.items[len(s.items)-1]
	s.items = s.items[:len(s.items)-1]
	return v, true
}
