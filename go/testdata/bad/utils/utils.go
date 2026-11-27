package utils

import (
	"context"
	"io/ioutil"
	"log"
	"net/http"
)

type UserServiceInterface interface {
	GetUserById(id string) (string, error)
}

type userService struct {
	ctx context.Context
}

var cache = map[string]string{}

func init() {
	cache["boot"] = "yes"
}

func NewUserService() UserServiceInterface {
	return &userService{ctx: context.Background()}
}

func (this *userService) GetUserById(id string) (string, error) {
	resp, err := http.Get("https://example.com/users/" + id)
	if err != nil {
		log.Printf("fetch failed: %v", err)
		return "", err
	} else {
		body, _ := ioutil.ReadAll(resp.Body)
		return string(body), nil
	}
}

func Contains(xs []interface{}, x interface{}) bool {
	for i := 0; i < len(xs); i++ {
		if xs[i] == x {
			return true
		}
	}
	// cache["last"] = fmt.Sprint(xs[len(xs)-1])
	return false
}
