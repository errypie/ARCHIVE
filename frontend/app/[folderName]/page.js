'use client'

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiFile, FiUploadCloud, FiLink, FiDownload } from 'react-icons/fi';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import config from '../../config';

// Стилизованные компоненты не меняются

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  min-width: 100vw;
  background: #008080;
  font-family: 'Tahoma', sans-serif;
  padding: 20px;
  overflow-x: hidden;
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
  margin: 0 auto;
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

const FileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
`;

const FileCard = styled.div`
  background: ${props => props.selected ? '#a0c4ff' : '#d4d0c8'};
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
`;

const FileIcon = styled.div`
  font-size: 40px;
  color: #808080;
  margin-bottom: 10px;
`;

const FileName = styled.div`
  font-size: 14px;
  color: #202020;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 5px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin: 20px 0;
`;

const ActionButton = styled.button`
  background: linear-gradient(to bottom, #ece9d8, #d4d0c8);
  border: 1px solid;
  border-top-color: #ffffff;
  border-left-color: #ffffff;
  border-right-color: #404040;
  border-bottom-color: #404040;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 5px;

  &:hover {
    background: linear-gradient(to bottom, #e0e0e0, #c8c8c8);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #ece9d8;
  padding: 20px;
  border: 2px solid;
  border-color: #404040 #fff #fff #404040;
`;

const BackButton = styled(ActionButton)`
  position: absolute;
  top: 10px;
  right: 10px;
`;

const DocumentList = () => {
  const params = useParams();
  const folderName = params?.folderName;
  const router = useRouter();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await axios.get(
          `${config.apiUrl}/folders/${folderName}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setFiles(response.data);
      } catch (err) {
        console.error('Error fetching documents:', err);
      } finally {
        setLoading(false);
      }
    };

    // Защита от SSR
    if (typeof window !== 'undefined' && folderName) {
      fetchDocuments();
    }
  }, [folderName, router]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      await axios.post(
        `${config.apiUrl}/upload?folder_name=${folderName}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const generateLink = async () => {
    if (!selectedFile) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${config.apiUrl}/generate_download_link?file_name=${selectedFile.title}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setGeneratedLink(response.data.download_link);
    } catch (err) {
      alert('Error generating link');
    }
  };

  const handleDownload = async (file) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        `${config.apiUrl}/document`,
        {
          params: {
            folder_name: folderName,
            file_name: file.title
          },
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.title);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(err.response?.data?.detail || 'Downloading failed!');
    }
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      router.push(`/search`);
    }
  };

  // Используем условный рендеринг для защиты от SSR гидратации
  if (typeof window === 'undefined') {
    return null; // Не рендерим на сервере
  }

  return (
    <Container>
      <WindowFrame>
        <TitleBar>
          <FiFile size={16} />
          {folderName} - Documents
          <SearchInput
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch} // Используйте onKeyDown вместо onKeyPress
          />
          <BackButton onClick={() => router.push('/')}>
            Home
          </BackButton>
        </TitleBar>

        <Content>
          <ButtonGroup>
            <ActionButton as="label">
              <FiUploadCloud />
              <input
                type="file"
                onChange={handleUpload}
                hidden
              />
              Upload file
            </ActionButton>

            <ActionButton onClick={generateLink} disabled={!selectedFile}>
              <FiLink />
              Create link
            </ActionButton>
          </ButtonGroup>

          {loading ? (
            <div>Loading...</div>
          ) : (
            <FileGrid>
              {files.map(file => (
                <FileCard
                  key={file.title}
                  selected={selectedFile?.title === file.title}
                  onClick={() => setSelectedFile(file)}
                >
                  <FileIcon>
                    <FiFile />
                  </FileIcon>
                  <FileName>{file.title}</FileName>
                  <ActionButton onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file);
                  }}>
                    <FiDownload />
                    Download
                  </ActionButton>
                </FileCard>
              ))}
            </FileGrid>
          )}
        </Content>
      </WindowFrame>

      {generatedLink && (
        <ModalOverlay onClick={() => setGeneratedLink(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <h3>Download link:</h3>
            <input
              type="text"
              value={generatedLink}
              readOnly
              style={{ width: '400px', margin: '10px 0' }}
            />
            <ButtonGroup>
              <ActionButton onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(generatedLink);
                  alert('Link copied to clipboard!');
                }
              }}>
                Copy
              </ActionButton>
              <ActionButton onClick={() => setGeneratedLink(null)}>
                Close
              </ActionButton>
            </ButtonGroup>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

export default DocumentList;
