'use client'

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { FiUser, FiKey } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import config from '../../config';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #008080;
  font-family: 'Tahoma', sans-serif;
`;

const WindowFrame = styled.div`
  background: #ece9d8;
  border: 2px solid;
  border-top-color: #ffffff;
  border-left-color: #ffffff;
  border-right-color: #404040;
  border-bottom-color: #404040;
  box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.3);
  width: 400px;
`;

const TitleBar = styled.div`
  background: #000080;
  color: white;
  padding: 4px 8px;
  font-weight: bold;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Content = styled.div`
  padding: 20px;
`;

const InputGroup = styled.div`
  margin-bottom: 15px;
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 8px 8px 28px;
  border: 1px solid #808080;
  background: white;
  font-size: 14px;
  box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.1);

  &:focus {
    outline: 1px solid #000080;
  }
`;

const Icon = styled.span`
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  color: #404040;
`;

const Button = styled.button`
  background: linear-gradient(to bottom, #ece9d8, #d4d0c8);
  border: 1px solid;
  border-top-color: #ffffff;
  border-left-color: #ffffff;
  border-right-color: #404040;
  border-bottom-color: #404040;
  padding: 6px 24px;
  cursor: pointer;
  font-size: 13px;
  margin-top: 10px;

  &:active {
    border-top-color: #404040;
    border-left-color: #404040;
    border-right-color: #ffffff;
    border-bottom-color: #ffffff;
  }

  &:hover {
    background: linear-gradient(to bottom, #e0e0e0, #c8c8c8);
  }
`;

const ErrorMessage = styled.div`
  color: #c10000;
  font-size: 12px;
  margin-top: 10px;
  padding: 4px;
  background: #ffd6d6;
  border: 1px solid #c10000;
`;

const TitleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 8h-2v2h2v2h-4v-2h2v-2h-2V9h4v2z"/>
  </svg>
)

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // Новое состояние для отслеживания монтирования
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true); // Отмечаем что компонент смонтирован на клиенте
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${config.apiUrl}/token`, new URLSearchParams({
        username,
        password,
        grant_type: 'password'
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (typeof window !== 'undefined') { // Дополнительная проверка
        localStorage.setItem('access_token', response.data.access_token);
      }
      router.push('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <WindowFrame>
        <TitleBar>
          <TitleIcon />
          Web Archive Authentication
        </TitleBar>

        <Content>
          <form onSubmit={handleSubmit}>
            <InputGroup>
              <Icon><FiUser size={16} /></Icon>
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </InputGroup>

            <InputGroup>
              <Icon><FiKey size={16} /></Icon>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </InputGroup>

            <Button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Login'}
            </Button>
            <Link href="/register" passHref legacyBehavior>
              <Button as="a">Register</Button>
            </Link>
            {isMounted && error && <ErrorMessage>{error}</ErrorMessage>}
          </form>
        </Content>
      </WindowFrame>
    </Container>
  );
};

export default LoginForm;
