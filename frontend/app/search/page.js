'use client'

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { FiSearch, FiFolder, FiDownload } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import Link from 'next/link'
import config from '../../config';

const SearchContainer = styled.div`
  display: flex;
  justify-content: center;
  min-height: 100vh;
  background: #008080;
  font-family: 'Tahoma', sans-serif;
  padding: 20px;
`;

const SearchWindow = styled.div`
  background: #ece9d8;
  border: 2px solid;
  border-top-color: #ffffff;
  border-left-color: #ffffff;
  border-right-color: #404040;
  border-bottom-color: #404040;
  box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.3);
  width: 800px;
  min-height: 400px;
`;

const SearchTitleBar = styled.div`
  background: #000080;
  color: white;
  padding: 4px 8px;
  font-weight: bold;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SearchContent = styled.div`
  padding: 20px;
`;

const SearchInputGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 8px;
  border: 1px solid #808080;
  background: white;
  font-size: 14px;
  box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.1);

  &:focus {
    outline: 1px solid #000080;
  }
`;

const SearchButton = styled.button`
  background: linear-gradient(to bottom, #ece9d8, #d4d0c8);
  border: 1px solid;
  border-top-color: #ffffff;
  border-left-color: #ffffff;
  border-right-color: #404040;
  border-bottom-color: #404040;
  padding: 6px 24px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;

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

const ResultsList = styled.div`
  border: 1px solid #808080;
  background: white;
  min-height: 200px;
  padding: 10px;
`;

const ResultItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #d4d0c8;
  font-size: 13px;

  &:last-child {
    border-bottom: none;
  }
`;

const FolderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #404040;
`;

const StatusMessage = styled.div`
  text-align: center;
  color: #404040;
  padding: 20px;
  font-size: 13px;
`;

const ErrorMessage = styled.div`
  color: #c10000;
  font-size: 12px;
  padding: 4px;
  background: #ffd6d6;
  border: 1px solid #c10000;
  margin-top: 10px;
`;

const SearchPage = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setError('')
    setLoading(true)

    try {
      const response = await axios.get(`${config.apiUrl}/search`, {
        params: { query },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      setResults(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  if (!isMounted) {
    return null
  }

  return (
    <SearchContainer>
      <SearchWindow>
        <SearchTitleBar>
          <FiSearch size={14} />
          Document Search - Web Archive
        </SearchTitleBar>

        <SearchContent>
          <form onSubmit={handleSearch}>
            <SearchInputGroup>
              <SearchInput
                type="text"
                placeholder="Enter search terms..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <SearchButton type="submit" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </SearchButton>
            </SearchInputGroup>
          </form>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <ResultsList>
            {loading ? (
              <StatusMessage>Searching documents...</StatusMessage>
            ) : results.length > 0 ? (
              results.map((doc, index) => (
                <ResultItem key={doc.id || index}>
                  <div>{doc.title}</div>
                  <FolderInfo>
                    <FiFolder size={14} />
                    <span>
                      <Link href={`/${doc.folder_name}`}>
                        {doc.folder_name}
                      </Link>
                    </span>
                  </FolderInfo>
                </ResultItem>
              ))
            ) : (
              !loading && <StatusMessage>No documents found</StatusMessage>
            )}
          </ResultsList>
        </SearchContent>
      </SearchWindow>
    </SearchContainer>
  )
}
export default SearchPage
