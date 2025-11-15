import React, { useState, useEffect } from 'react';
import { Layout, Table, Button, Modal, Form, Input, Popconfirm, Space, ConfigProvider, theme, Typography, Spin, Collapse, Tag, Row, Col, App as AntApp } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, HistoryOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;
const { Search } = Input;
const { Panel } = Collapse;

// For Vite proxy
const svcUrl = '/api/tasks';

interface Task {
  id: string;
  name: string;
  owner: string;
  command: string;
  taskExecutions: Exec[];
}

interface Exec {
  startTime: string;
  endTime: string;
  output: string;
}


const TaskMaster: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [load, toggleSpinner] = useState(false);

  const [modal, toggleTaskModal] = useState(false);
  const [histModal, toggleHistModal] = useState(false);

  const [selTask, setSelTask] = useState<Task | null>(null);
  
  const [form] = Form.useForm();
  
  const { message } = AntApp.useApp(); 

  const getTasks = async () => {
    toggleSpinner(true);
    try {
      const APICall = await fetch(svcUrl);

      if (!APICall.ok) throw new Error('NETWORK ERROR');

      const data = await APICall.json();
      setTasks(data);

    } catch (err) { message.error('ERROR: task failed'); } 

    finally { toggleSpinner(false); }
  };

  // get the initial list on load -------------------------
  useEffect(() => { getTasks(); }, []);

  const search = async (val: string) => {
    if (!val) {
      getTasks();
      return;
    }

    toggleSpinner(true);

    try {
      const APICall = await fetch(`${svcUrl}/find?name=${val}`);
      if (APICall.status === 404) {
        setTasks([]);
        message.info('No tasks found');
        return;
      }

      if (!APICall.ok) throw new Error('NETWORK ERROR');

      const data = await APICall.json();
      setTasks(data);

    } catch (err) { message.error('ERROR: Search Failed'); } 
    finally { toggleSpinner(false); }
  };

  const openForm = (task: Task | null) => {
    setSelTask(task);
    if (task) { form.setFieldsValue(task); } 
    else { form.resetFields(); }
    toggleTaskModal(true);
  };

  const saveTask = async (vals: any) => {
    toggleSpinner(true);
    try {
      const APICall = await fetch(svcUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vals),
      });

      if (!APICall.ok) throw new Error('ERROR: Cant save task');

      message.success(selTask ? 'Updated' : 'Created'); // if there is a selected Task, it is updated, if not it is created
      toggleTaskModal(false);
      getTasks();
    } catch (err) { message.error('ERROR: Cant save task'); 
    } finally { toggleSpinner(false); }
  };

  const delTask = async (id: string) => {
    toggleSpinner(true);
    try {
      const APICall = await fetch(`${svcUrl}/${id}`, { method: 'DELETE' });

      if (!APICall.ok) throw new Error('ERROR: Failed to Delete');

      message.success('Deleted');
      getTasks();
    } catch (err) { message.error('ERROR: Failed to Delete');
    } finally { toggleSpinner(false); }
  };

  const runTask = async (id: string) => {
    toggleSpinner(true);
    //message.loading({ content: 'Executing...', key: 'run' });
    
    try {
      const res = await fetch(`${svcUrl}/${id}/execute`, { method: 'PUT' });

      if (!res.ok) throw new Error('ERROR: Execution Failed!');

      message.success({ content: 'Task Executed', key: 'run' });
      getTasks();

    } catch (err) { message.error('ERROR: Execution Failed!');
    } finally { toggleSpinner(false); }
  };

  const showHist = (task: Task) => {
    setSelTask(task);
    toggleHistModal(true);
  };

  const cols = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Owner', dataIndex: 'owner', key: 'owner' },
    { title: 'Command', dataIndex: 'command', key: 'command', render: (cmd: string) => <p>{cmd}</p> },
    { title: 'History', dataIndex: 'taskExecutions', key: 'history', render: (ex: Exec[]) => `${ex.length} run(s)` },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, task: Task) => (
        <Space size="middle">
          <Button type="primary" shape="circle" icon={<PlayCircleOutlined />} onClick={() => runTask(task.id)} />
          <Button shape="circle" icon={<HistoryOutlined />} onClick={() => showHist(task)} />
          <Button shape="circle" icon={<EditOutlined />} onClick={() => openForm(task)} />
          <Popconfirm title="Delete this task?" onConfirm={() => delTask(task.id)} okText="Delete">
            <Button type="primary" danger shape="circle" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const formatDate = (dtStr: string) => new Date(dtStr).toLocaleString();

  const getStatus = (output: string) => {
    if (output.startsWith("Failed:")) {
      return <Tag icon={<ExclamationCircleOutlined />} color="error">Failed</Tag>
    }
    return <Tag icon={<CheckCircleOutlined />} color="success">Success</Tag>
  }


  // RENDERING ----------------------------------------------------------------------------------------------------
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header>
        <Title>
          Task Master
        </Title>
      </Header>
      <Content>
        <Layout style={{ padding: '24px 48px' }}>
          <Spin spinning={load} tip="Loading...">
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col flex="auto">
                <Search
                  placeholder="Search tasks..."
                  enterButton="Search"
                  onSearch={search}
                  allowClear
                />
              </Col>
              <Col>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm(null)}>
                  Create Task
                </Button>
              </Col>
            </Row>
            
            <Table 
              columns={cols} 
              dataSource={tasks} 
              rowKey="id" 
              pagination={{ pageSize: 25 }}
            />
          </Spin>
        </Layout>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        Thejas Menon
      </Footer>

      <Modal // Create Task Modal --------------------------------------------------------------
        title={selTask ? 'Edit Task' : 'Create Task'}
        open={modal}
        onCancel={() => toggleTaskModal(false)}
        footer={null}
        destroyOnHidden
      >

        <Form form={form} layout="vertical" onFinish={saveTask} style={{ marginTop: 24 }}>
          <Form.Item name="id" label="Task ID" rules={[{ required: true }]}>
            <Input disabled={!!selTask} />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="owner" label="Owner" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="command" label="Command" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={load} style={{ width: '100%' }}>
              Save Task
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal // History Modal ------------------------------------------------------------------------
        title={`History: ${selTask?.name}`}
        open={histModal}
        onCancel={() => toggleHistModal(false)}
        footer={[<Button key="close" onClick={() => toggleHistModal(false)}>Close</Button>]}
        width={800}
        destroyOnHidden
      >

        {selTask?.taskExecutions.length === 0 ? (
          <p>No execution history.</p>
        ) : (
          <Collapse accordion>
            {selTask?.taskExecutions.slice().reverse().map((exec, idx) => (
              <Panel 
                header={
                  <Space>
                    {getStatus(exec.output)}
                    <Typography.Text>{`Run at: ${formatDate(exec.startTime)}`}</Typography.Text>
                  </Space>
                } 
                key={idx}
              >
                <p><strong>Start:</strong> {formatDate(exec.startTime)}</p>
                <p><strong>End:</strong> {formatDate(exec.endTime)}</p>
                <p><strong>Output:</strong></p>
                <pre style={{ 
                  background: '#222', 
                  color: '#eee', 
                  padding: '10px 15px', 
                  borderRadius: 4, 
                  whiteSpace: 'pre-wrap', 
                  wordWrap: 'break-word',
                  maxHeight: 300,
                  overflowY: 'auto'
                }}>
                  {exec.output || '(No output)'}
                </pre>
              </Panel>
            ))}
          </Collapse>
        )}
      </Modal>
    </Layout>
  );
};


const App: React.FC = () => (
  <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
    <AntApp>
      <TaskMaster />
    </AntApp>
  </ConfigProvider>
);

export default App;