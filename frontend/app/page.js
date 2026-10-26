'use client'

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FiFolder } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import config from '../config';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #008080;
  font-family: 'Tahoma', sans-serif;
  padding: 20px;
`;

const WindowFrame = styled.div`
  background: #ece9d8;
  border: 2px solid;
  border-top-color: #ffffff;
  border-left-color: #ffffff;
  border-right-color: #404040;
  border-bottom-color: #404040;
  box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 800px;
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
  cursor: default;
`;

const SearchInput = styled.input`
  margin-left: auto;
  padding: 4px 8px;
  border: 1px solid #808080;
  background: white;
  font-size: 12px;
  width: 200px;
  box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.1);
  color: #000000;

  &:focus {
    outline: 1px solid #000080;
  }
`;

const Content = styled.div`
  padding: 20px;
  max-height: 600px;
  overflow-y: auto;
`;

const FolderGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 15px;
`;

const FolderCard = styled.div`
  background: #d4d0c8;
  border: 1px solid #808080;
  padding: 15px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  &:hover {
    background: #e0e0e0;
    box-shadow: inset 1px 1px 2px rgba(0,0,0,0.1);
    transform: translate(-1px, -1px);
  }

  &:active {
    transform: translate(0);
  }
`;

const FolderIcon = styled.div`
  font-size: 48px;
  color: #808080;
  margin-bottom: 10px;
`;

const FolderName = styled.div`
  font-size: 14px;
  color: #202020;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 5px;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
`;

const LoadingDots = styled.div`
  color: #000080;
  font-size: 24px;
  text-align: center;

  &::after {
    content: '...';
    animation: dots 1.5s infinite;
  }

  @keyframes dots {
    0%, 20% { content: ''; }
    40% { content: '.'; }
    60% { content: '..'; }
    80%, 100% { content: '...'; }
  }
`;

const ErrorMessage = styled.div`
  color: #c10000;
  font-size: 12px;
  margin-top: 10px;
  padding: 4px;
  background: #ffd6d6;
  border: 1px solid #c10000;
  text-align: center;
`;

const ClientOnlyLoader = () => {
  return (
    <Container>
      <WindowFrame>
        <TitleBar>
          <FiFolder size={16} />
          Folders
        </TitleBar>
        <Content>
          <LoadingContainer>
            <LoadingDots>Loading</LoadingDots>
          </LoadingContainer>
        </Content>
      </WindowFrame>
    </Container>
  );
};

const FolderList = () => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const fetchFolders = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await axios.get(`${config.apiUrl}/folders`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setFolders(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching folders:', err);
        setError('Failed to load folders');
        setLoading(false);
      }
    };

    fetchFolders();
  }, [router, isClient]);
  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      router.push(`/search`);
    }
  };

  if (!isClient) {
    return <ClientOnlyLoader />;
  }

  if (loading) {
    return (
      <Container>
        <WindowFrame>
          <TitleBar>
            <FiFolder size={16} />
            Folders
          </TitleBar>
          <Content>
            <LoadingContainer>
              <LoadingDots>Loading</LoadingDots>
            </LoadingContainer>
          </Content>
        </WindowFrame>
      </Container>
    );
  }

  return (
    <Container>
      <WindowFrame>
        <TitleBar>
          <FiFolder size={16} />
          Folders Explorer
          <SearchInput
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </TitleBar>

        <Content>
          {error && <ErrorMessage>{error}</ErrorMessage>}

          <FolderGrid>
            {folders.map(folder => (
              <FolderCard key={folder.id} onClick={() => router.push(`/${folder.name}`)}>
                <FolderIcon>
                  <FiFolder />
                </FolderIcon>
                <FolderName>{folder.name}</FolderName>
              </FolderCard>
            ))}
          </FolderGrid>
        </Content>
      </WindowFrame>
    </Container>
  );
};

export default FolderList;
