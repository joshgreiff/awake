import React, { useState } from 'react';
import { useMutation } from '@apollo/client'
import { ADD_USER } from '../../utils/mutations'
import Auth from '../../utils/auth'

export default function Sign() {
    // use state and set default values for form
    const [formState, setFormState] = useState({ username: '', email: '', password: ''})
    // use add user query 
    const [addUser, { error }] = useMutation(ADD_USER)

    //update state based on input chages
    const handleChange = (event) => {
        const { name, value } = event.target

        setFormState({
            ...formState,
            [name]: value
        })
    }

    // submit form 
    const handleFormSubmit = async (event) => {
        event.preventDefault()

        try {
            // execute addUser mutation and pass in variable data from form
            const { data } = await addUser({
                variables: {...formState}
            })
            Auth.login(data.addUser.token)
        } catch(e) {
            console.error(e)
        }
        
    }

    return( 
        <div className="bg-grey-lighter min-h-screen flex flex-col">
            <div className="container max-w-sm mx-auto flex-1 flex flex-col items-center justify-center px-2">
                <div className="bg-white px-6 py-8 rounded shadow-md text-black w-full">
                    <h1 className="mb-8 text-3xl text-center bg-white">Sign Up</h1>
                        <form onSubmit={handleFormSubmit} className="bg-white text-center">
                            <input
                            type="text"
                            className="block border border-grey-light w-5/6 p-3 rounded mb-4 mx-auto"
                            name="username"
                            placeholder="Username"
                            value={formState.username}
                            onChange={handleChange}
                            />
                            <input
                            type="text"
                            className="block border border-grey-light w-5/6 p-3 rounded mb-4 mx-auto"
                            name="email"
                            placeholder="Email"
                            value={formState.email}
                            onChange={handleChange}
                            />
                            <input
                            type="password"
                            className="block border border-grey-light w-5/6 p-3 rounded mb-4 mx-auto"
                            name="password"
                            placeholder="Password"
                            value={formState.password}
                            onChange={handleChange}
                            />
                            {/* <input
                            type="password"
                            className="block border border-grey-light w-full p-3 rounded mb-4"
                            name="confirm_password"
                            placeholder="Confirm Password"
                            /> */}
                            <button
                            type="submit"
                            className="w-5/6 text-center py-3 rounded bg-purple-400 text-black hover:bg-green-dark focus:outline-none my-1 mx-auto"
                            >
                            Create Account
                            </button>
                        </form>
                </div>
                {error && <div className='text-red-400'>Sign up failed</div>}
                <div className="text-white mt-6">
                    Already have an account?
                    <a
                    className="no-underline border-b border-blue text-blue"
                    href="/login"
                    >
                        <span> </span>
                    Log in
                    </a>
                    .
                </div>
            </div>
      </div>
      
    )
}