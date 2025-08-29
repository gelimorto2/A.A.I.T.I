import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Stack } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import axios from 'axios';

interface UserRow { id: number; username: string; email: string; role: string; created_at: string; last_login: string; is_active: number; }

const AdminPage: React.FC = () => {
  const token = useSelector((s: RootState) => s.auth.token);
  const user = useSelector((s: RootState) => s.auth.user);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [resetResult, setResetResult] = useState<string | null>(null);

  const api = axios.create({ baseURL: '/api', headers: { Authorization: `Bearer ${token}` }});

  const loadUsers = async () => {
    try { setLoading(true); const res = await api.get('/users'); setUsers(res.data.users); } catch(e:any){ setError(e.response?.data?.error||'Failed'); } finally { setLoading(false);} };
  useEffect(()=>{ loadUsers(); // eslint-disable-next-line
  },[]);

  const promote = async (id:number) => { await api.post(`/users/${id}/promote`); loadUsers(); };
  const demote = async (id:number) => { await api.post(`/users/${id}/demote`); loadUsers(); };

  const handleReset = async () => {
    try { const res = await api.post('/users/system/reset-accounts', { confirm: 'RESET' }); setResetResult(res.data.message); setResetOpen(false); } catch(e:any){ setResetResult(e.response?.data?.error||'Reset failed'); } finally { setConfirmText(''); loadUsers(); }
  };

  if (!user || user.role !== 'admin') {
    return <Alert severity="error">Admin access required.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Administration</Typography>
      <Stack direction={{xs:'column', md:'row'}} spacing={2} sx={{mb:2}}>
        <Button variant="contained" color="warning" onClick={()=>setResetOpen(true)}>Reset Accounts & Credentials</Button>
      </Stack>
      {resetResult && <Alert severity="info" sx={{mb:2}}>{resetResult}</Alert>}
      {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}
      <Paper sx={{overflow:'auto'}}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell><TableCell>User</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell><TableCell>Created</TableCell><TableCell>Last Login</TableCell><TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(u=> (
              <TableRow key={u.id} hover>
                <TableCell>{u.id}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell><Chip label={u.role} color={u.role==='admin'?'success': u.role==='trader'?'primary':'default'} size="small" /></TableCell>
                <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{u.last_login? new Date(u.last_login).toLocaleString(): '—'}</TableCell>
                <TableCell align="right">
                  {u.role !== 'admin' && <Button size="small" onClick={()=>promote(u.id)}>Promote</Button>}
                  {u.role === 'admin' && String(u.id) !== String(user.id) && <Button size="small" color="secondary" onClick={()=>demote(u.id)}>Demote</Button>}
                </TableCell>
              </TableRow>
            ))}
            {!loading && users.length===0 && <TableRow><TableCell colSpan={7} align="center">No users</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={resetOpen} onClose={()=>setResetOpen(false)}>
        <DialogTitle>Danger: Reset All Accounts</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{mb:2}}>This will delete ALL user accounts and audit logs. The next registered user will become the new admin. Type RESET to confirm.</Alert>
          <TextField value={confirmText} onChange={e=>setConfirmText(e.target.value)} fullWidth label="Type RESET" />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setResetOpen(false)}>Cancel</Button>
          <Button color="error" disabled={confirmText!=='RESET'} onClick={handleReset}>Confirm Reset</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPage;
