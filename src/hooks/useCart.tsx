import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const perpetuateCart = (updatedCart: Product[]) => {
    setCart(updatedCart)
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart))
  }

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyExists = cart.find(product => product.id === productId);

      if (productAlreadyExists) {
        await updateProductAmount({
          productId,
          amount: productAlreadyExists.amount + 1
        })

        return;
      }

      const { data: requestedProduct } = await api.get<Product>(`/products/${productId}`);

      const requestedProductWithAmount = {
        ...requestedProduct,
        amount: 1
      }

      const updatedCart = [...cart, requestedProductWithAmount]
  
      perpetuateCart(updatedCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.some(product => product.id === productId);

      if (!productExists) {
        throw new Error("Produto não existe");
      }

      const updatedCart = cart.filter(product => product.id !== productId);

      perpetuateCart(updatedCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map(product => product.id !== productId ? product : ({
        ...product,
        amount
      }))

      setCart(updatedCart)
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
