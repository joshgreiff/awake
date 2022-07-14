import React from 'react'
import shop from "../../assets/shop/shop-with-sign.svg"

export default function Shop() {
    return (   
        <div>
            <body className="bg-gradient-to-b from-blue-400">
                <div>
                    <div className="flex items-center">
                        <div className="shopscreen h-screen w-full bg-no-repeat relative"
                            style={{
                            backgroundSize: "auto",
                            backgroundAttachment: "relative",
                            backgroundImage: `url(${shop})`,
                            }}>
                        </div>
                    </div>
                </div>
            </body>

        
        </div> 

    )
}